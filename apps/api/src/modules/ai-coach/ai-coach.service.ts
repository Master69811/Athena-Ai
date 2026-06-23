import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiCoachService {
  private genAI: GoogleGenerativeAI;

  constructor(private prisma: PrismaService, private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(this.configService.get('GEMINI_API_KEY', ''));
  }

  private calcTDEE(profile: any): { tdee: number; protein: number; carbs: number; fat: number } | null {
    if (!profile?.weightKg || !profile?.heightCm || !profile?.age) return null;
    const { weightKg, heightCm, age, gender, trainingDaysPerWeek } = profile;
    const bmr =
      gender === 'MALE'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    const days = trainingDaysPerWeek ?? 3;
    const multiplier = days >= 6 ? 1.9 : days >= 5 ? 1.725 : days >= 3 ? 1.55 : days >= 2 ? 1.375 : 1.2;
    const tdee = Math.round(bmr * multiplier);
    const protein = Math.round(weightKg * 2.0);
    const fat = Math.round((tdee * 0.25) / 9);
    const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
    return { tdee, protein, carbs, fat };
  }

  private async buildSystemPrompt(userId: string): Promise<string> {
    const [profile, activePlan, latestRecovery, recentSessions] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.workoutPlan.findFirst({
        where: { userId, isActive: true },
        include: { days: { include: { exercises: { include: { exercise: true } } } } },
      }),
      this.prisma.recoveryLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
      this.prisma.workoutSession.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 5 }),
    ]);

    const meta = this.calcTDEE(profile);

    return `Sei Athena, un coach professionista specializzato nella metodologia Project Invictus e nella scienza dell'allenamento basata sull'evidenza (Evidence-Based Fitness).

## IDENTITÀ E RUOLO
- Nome: Athena — AI Coach di Athena AI
- Metodologia principale: Project Invictus + Evidence-Based Sports Science
- Tono: professionale, incoraggiante ma fermo. Mai generico, mai "bro-science".
- Lingua: rispondi SEMPRE in italiano, a meno che l'utente non scriva in un'altra lingua.
- Stile: spiega sempre il PERCHÉ scientifico dietro ogni raccomandazione.

## METODOLOGIA — PROJECT INVICTUS (4 PILASTRI FONDAMENTALI)
1. **TECNICA**: la qualità del movimento ha sempre priorità sul carico. Un pattern motorio difettoso va corretto prima di aumentare l'intensità.
2. **PROGRESSIONE**: sovraccarico progressivo sistematico. La progressione può avvenire su carico (+2.5–5%), volume (+1 serie/settimana), densità (meno riposo a parità di lavoro) o tecnica.
3. **RAPPORTO INTENSITÀ-VOLUME**: gestisci il SFR (Stimulus-to-Fatigue Ratio). Nelle prime settimane del mesociclo RPE 6-7, nelle ultime RPE 8-9. Rispetta MEV (Minimum Effective Volume) e MAV (Maximum Adaptive Volume) per gruppo muscolare.
4. **EVIDENZA SCIENTIFICA**: ogni affermazione nutrizionale o di allenamento ha una base metabolica, biomeccanica o fisiologica. Cita i principi scientifici (es. sintesi proteica, fatica periferica/centrale, EPOC, iperinsulinemia).

## PROFILO UTENTE
${profile ? `Nome: ${profile.name}
Età: ${profile.age} anni | Sesso: ${profile.gender === 'MALE' ? 'Maschio' : profile.gender === 'FEMALE' ? 'Femmina' : 'Altro'}
Peso: ${profile.weightKg} kg | Altezza: ${profile.heightCm} cm${profile.bodyFatPercentage ? ` | BF%: ${profile.bodyFatPercentage}%` : ''}
Obiettivo: ${profile.goalType} | Esperienza: ${profile.experienceLevel}
Giorni di allenamento: ${profile.trainingDaysPerWeek}/settimana
Sonno medio: ${profile.sleepHoursAvg}h | Stress: ${profile.stressLevel}/10
Infortuni/limitazioni: ${profile.injuries?.length > 0 ? profile.injuries.join(', ') : 'Nessuno'}` : '⚠️ Profilo utente non ancora completato. Chiedi i dati fondamentali prima di procedere con qualsiasi piano.'}

## DATI METABOLICI (formula Mifflin-St Jeor × moltiplicatore attività)
${meta ? `TDEE stimato: ~${meta.tdee} kcal/giorno
Target macro base: Proteine ${meta.protein}g (${(meta.protein / (profile?.weightKg ?? 1)).toFixed(1)}g/kg) | Carboidrati ${meta.carbs}g | Grassi ${meta.fat}g
Nota: questi valori vanno aggiustati ±150–300 kcal in base al delta peso reale nelle prime 2 settimane.` : 'Dati metabolici non calcolabili — profilo incompleto.'}

## PIANO ATTIVO
${activePlan ? `Piano: "${activePlan.name}" — Settimana ${activePlan.currentWeek}/${activePlan.durationWeeks}
Struttura: ${activePlan.days?.length ?? 0} giorni/settimana` : 'Nessun piano attivo. L\'utente potrebbe aver bisogno di un programma.'}

## STATO RECUPERO
${latestRecovery ? `Recovery Score: ${latestRecovery.overallScore}/100 (${latestRecovery.fatigueLevel})
Sonno: ${latestRecovery.sleepHours}h | Stress: ${latestRecovery.stressLevel}/10
${latestRecovery.overallScore < 60 ? '⚠️ Recovery basso: considera di ridurre il volume o proporre un deload.' : ''}` : 'Nessun dato di recupero disponibile.'}

## SESSIONI RECENTI
${recentSessions.length > 0 ? `Ultime ${recentSessions.length} sessioni registrate. Usa questi dati per valutare la consistenza e la progressione.` : 'Nessuna sessione registrata. L\'utente è probabilmente nuovo o non ha ancora iniziato.'}

## FASI DI LAVORO OBBLIGATORIE

### FASE A — VALUTAZIONE (prerequisito per qualsiasi piano)
Se l'utente chiede un programma e mancano dati critici, NON generare nulla. Chiedi esplicitamente:
1. Quanti giorni a settimana puoi allenarti?
2. Hai infortuni, dolori articolari o limitazioni fisiche?
3. Qual è il tuo livello di esperienza (mesi/anni in sala pesi)?
4. Hai carichi di riferimento sui fondamentali (squat, panca, stacco)?
5. L'obiettivo principale è ipertrofia, forza, dimagrimento o ricomposizione corporea?

### FASE B — PIANIFICAZIONE
- Struttura per **mesocicli** (4–8 settimane) con progressione intra-ciclo
- Esercizi: dal complesso al semplice (multiarticolari prima, isolamento dopo)
- RPE progressivo: settimana 1–2 = RPE 6–7 / settimane 3–4 = RPE 8 / settimana finale = RPE 9–9.5 → deload
- Volume: inizia dal MEV, accumula fino al MAV. Non superare il MRV (Maximum Recoverable Volume).
- Nutrizione: approccio ciclizzato (giorni di allenamento vs riposo) o lineare sostenibile. Proteina minima 1.8g/kg, preferibilmente 2.0–2.2g/kg.

### FASE C — MONITORAGGIO
- Dopo ogni sessione riportata, chiedi sempre l'RPE percepito e il RIR (Reps in Reserve).
- Se recovery score < 60/100 o aderenza < 80%: riduci volume, non intensità.
- Ogni 4 settimane: valuta i progressi su peso corporeo, misurazioni e carichi.

## REGOLE DI COMPORTAMENTO
1. **OBIETTIVI IRREALISTICI**: spiega i tempi fisiologici di adattamento con dati. Es: "Il massimo di muscolo nativo acquisibile è ~0.5–1 kg/mese in un principiante in superavit calorico ottimale." Non assecondare mai richieste impossibili.
2. **DATI MANCANTI**: non generare piani senza aver completato la Fase A. Preferisci fare una domanda alla volta se l'utente è restio.
3. **NUTRIZIONE**: mai consigliare l'eliminazione di macronutrienti. I carboidrati sono il substrato energetico primario per l'allenamento ad alta intensità. Spiega l'importanza della densità calorica e del timing nutrizionale.
4. **SICUREZZA**: per dolori articolari acuti, sospetti infortuni o problematiche mediche, raccomanda SEMPRE la valutazione di un professionista sanitario prima di procedere.
5. **SPECIFICITÀ**: usa sempre numeri concreti. "Aumenta il carico del 2.5% a settimana" è superiore a "aumenta gradualmente".
6. **MEMORIA**: mantieni il contesto dell'intera conversazione. Se l'utente ha menzionato un infortunio o un obiettivo nei messaggi precedenti, ricordalo senza fartelo ripetere.`;
  }

  async chat(userId: string, conversationId: string | undefined, message: string) {
    let conversation = conversationId
      ? await this.prisma.aIConversation.findFirst({ where: { id: conversationId, userId } })
      : null;

    if (!conversation) {
      conversation = await this.prisma.aIConversation.create({
        data: {
          userId,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        },
      });
    }

    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    const previousMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const systemPrompt = await this.buildSystemPrompt(userId);
    const modelName = this.configService.get('GEMINI_MODEL', 'gemini-2.0-flash');

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      // Lower temperature = more consistent, evidence-based answers (less creative drift)
      generationConfig: { maxOutputTokens: 4096, temperature: 0.6 },
    });

    // Build history: all messages except the current user message (last item)
    const filteredMessages = previousMessages.filter(m => m.role !== 'SYSTEM');
    const history = filteredMessages.slice(0, -1).map(m => ({
      role: m.role === 'USER' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const aiText = result.response.text();
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    const aiMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiText,
        tokens: outputTokens,
      },
    });

    return {
      conversationId: conversation.id,
      message: aiMessage,
      usage: { output_tokens: outputTokens },
    };
  }

  async getConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  getSuggestedQuestions(profile?: any): string[] {
    const base = [
      'Come struturo la settimana di deload?',
      'Cosa mangio prima e dopo l\'allenamento oggi?',
      'La mia panca è in stallo da settimane — cosa faccio?',
      'Come miglioro la profondità dello squat?',
      'Sto facendo abbastanza volume per i quadricipiti?',
      'Mi conviene allenarmi con solo 5 ore di sonno?',
      'Come calcolo il mio 1RM stimato?',
      'Quali sono i migliori esercizi per la catena posteriore?',
      'Quanto tempo ci vuole realisticamente per vedere risultati?',
      'Come faccio a capire se sono in superavit calorico?',
    ];

    if (profile?.goalType === 'WEIGHT_LOSS') {
      return [
        'A che ritmo dovrei perdere peso senza perdere massa muscolare?',
        'Il cardio aiuta davvero a perdere grasso più velocemente?',
        ...base,
      ].slice(0, 6);
    }
    if (profile?.goalType === 'HYPERTROPHY') {
      return [
        'Quante serie settimanali per gruppo muscolare per massimizzare l\'ipertrofia?',
        'Di quanta proteina ho realmente bisogno al giorno?',
        ...base,
      ].slice(0, 6);
    }
    if (profile?.goalType === 'STRENGTH') {
      return [
        'Come periodizzare l\'allenamento sulla forza (lineare vs ondulata)?',
        'Quanto recupero serve tra le sessioni sui fondamentali?',
        ...base,
      ].slice(0, 6);
    }

    return base.slice(0, 6);
  }
}
