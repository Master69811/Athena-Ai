import { SchemaType, Tool } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gemini function declarations — "il calcolatore" separato da "il cervello" (LLM).
 * Athena chiama queste funzioni per dati precisi invece di inventarli.
 */
export const ATHENA_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'calcolaMetabolismo',
        description:
          'Calcola TDEE (fabbisogno calorico totale) e target macro giornalieri usando la formula Mifflin-St Jeor con moltiplicatore attività. Usa questa funzione quando l\'utente chiede quante calorie mangiare, il suo fabbisogno, o i macro target.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'getStoricoCarichi',
        description:
          'Recupera lo storico dei carichi dell\'utente sugli ultimi 10 allenamenti. Usa questa funzione quando l\'utente chiede della sua progressione, dei suoi PR, o quando vuoi valutare se i carichi stanno aumentando nel tempo.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            exerciseName: {
              type: SchemaType.STRING,
              description: 'Nome dell\'esercizio da analizzare (opzionale). Se non specificato, restituisce gli ultimi set registrati.',
            },
          },
          required: [],
        },
      },
      {
        name: 'getRecuperoAttuale',
        description:
          'Recupera il recovery score e i dati di sonno/stress più recenti. Usa questa funzione quando l\'utente chiede se allenarsi oggi, se è pronto per un\'alta intensità, o dopo che ha riportato stanchezza.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'getPianoAttivo',
        description:
          'Recupera i dettagli del piano di allenamento attivo: esercizi, serie, ripetizioni e settimana corrente. Usa questa funzione quando l\'utente chiede del suo programma, di cosa fare oggi, o vuole sapere a che punto è del ciclo.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
    ],
  },
];

/**
 * Esecutore delle funzioni — mappa nome → logica DB.
 */
export async function executeAthenaFunction(
  name: string,
  args: Record<string, any>,
  userId: string,
  prisma: PrismaService,
): Promise<Record<string, any>> {
  switch (name) {
    case 'calcolaMetabolismo': {
      const profile = await prisma.userProfile.findUnique({ where: { userId } });
      if (!profile?.weightKg || !profile?.heightCm || !profile?.age) {
        return { errore: 'Profilo incompleto. Chiedi all\'utente peso, altezza ed età.' };
      }
      const bmr =
        profile.gender === 'MALE'
          ? 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5
          : 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
      const days = profile.trainingDaysPerWeek ?? 3;
      const mult = days >= 6 ? 1.9 : days >= 5 ? 1.725 : days >= 3 ? 1.55 : days >= 2 ? 1.375 : 1.2;
      const tdee = Math.round(bmr * mult);
      const protein = Math.round(profile.weightKg * 2.0);
      const fat = Math.round((tdee * 0.25) / 9);
      const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
      return {
        formula: 'Mifflin-St Jeor',
        bmr_kcal: Math.round(bmr),
        tdee_kcal: tdee,
        moltiplicatore_attività: mult,
        giorni_allenamento: days,
        macro_target: { proteine_g: protein, carboidrati_g: carbs, grassi_g: fat },
        note: `Proteine a 2g/kg (${profile.weightKg}kg). Aggiusta il TDEE ±150kcal dopo 2 settimane in base al delta peso reale.`,
      };
    }

    case 'getStoricoCarichi': {
      const sessions = await prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          sets: {
            include: { exercise: true },
            where: args.exerciseName
              ? { exercise: { name: { contains: args.exerciseName, mode: 'insensitive' } } }
              : undefined,
          },
        },
      });
      if (!sessions.length) return { risultato: 'Nessuna sessione registrata.' };
      const history = sessions.map((s) => ({
        data: s.startedAt.toISOString().split('T')[0],
        sets: s.sets.map((set) => ({
          esercizio: set.exercise?.name ?? 'Sconosciuto',
          kg: set.weightKg,
          reps: set.reps,
          rpe: set.rpe,
        })),
      }));
      return { storico: history };
    }

    case 'getRecuperoAttuale': {
      const log = await prisma.recoveryLog.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });
      if (!log) return { risultato: 'Nessun dato di recupero disponibile. Chiedi all\'utente come si sente oggi.' };
      return {
        data: log.date.toISOString().split('T')[0],
        recovery_score: log.overallScore,
        livello_fatica: log.fatigueLevel,
        sonno_ore: log.sleepHours,
        qualità_sonno: log.sleepQuality,
        stress: log.stressLevel,
        energia: log.energyLevel,
        raccomandazione:
          log.overallScore >= 80
            ? 'Verde: pronto per alta intensità (RPE 8-9)'
            : log.overallScore >= 60
              ? 'Giallo: allenamento moderato, evita PR e volume massimale'
              : 'Rosso: considera deload o riposo attivo',
      };
    }

    case 'getPianoAttivo': {
      const plan = await prisma.workoutPlan.findFirst({
        where: { userId, isActive: true },
        include: {
          days: {
            orderBy: { dayIndex: 'asc' },
            include: { exercises: { include: { exercise: true } } },
          },
        },
      });
      if (!plan) return { risultato: 'Nessun piano attivo. L\'utente ha bisogno di un programma.' };
      return {
        nome: plan.name,
        settimana_corrente: plan.currentWeek,
        durata_settimane: plan.durationWeeks,
        giorni: (plan as any).days?.map((d: any) => ({
          indice: d.dayIndex,
          nome: d.name,
          esercizi: d.exercises?.map((e: any) => ({
            esercizio: e.exercise?.name,
            serie: e.sets,
            ripetizioni: e.reps,
            rir_target: e.rirTarget,
          })) ?? [],
        })) ?? [],
      };
    }

    default:
      return { errore: `Funzione sconosciuta: ${name}` };
  }
}
