import { PrismaClient, ExerciseCategory, MuscleGroup, Equipment, ExerciseDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

const exercises = [
  { name: 'Panca Piana con Bilanciere', nameIt: 'Panca Piana', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.CHEST, MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS], secondaryMuscles: [], equipment: [Equipment.BARBELL, Equipment.BENCH], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['Stenditi sulla panca con piedi piatti sul pavimento', 'Impugna il bilanciere leggermente più largo delle spalle', 'Abbassa controllato al petto, poi spingi esplosivamente'], commonMistakes: ['Non arcuare eccessivamente la schiena', 'Non rimbalzare il bilanciere sul petto', 'Mantenere i polsi dritti'], variations: ['Panca con manubri', 'Panca inclinata', 'Panca declinata'], progressions: ['Aggiungere 2.5kg a settimana'], regressions: ['Panca con manubri leggeri', 'Push-up'] },
  { name: 'Squat con Bilanciere', nameIt: 'Squat', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.QUADS, MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS], secondaryMuscles: [MuscleGroup.CORE], equipment: [Equipment.BARBELL, Equipment.SQUAT_RACK], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['Posiziona il bilanciere sui trapezi', 'Piedi larghezza spalle, punte leggermente aperte', 'Scendi mantenendo il petto alto e le ginocchia sui piedi'], commonMistakes: ['Ginocchia che cedono verso dentro', 'Busto troppo inclinato in avanti', 'Talloni che si alzano'], variations: ['Front Squat', 'Hack Squat', 'Goblet Squat'], progressions: ['Aumentare carico 5kg/settimana'], regressions: ['Goblet Squat', 'Leg Press'] },
  { name: 'Stacco da Terra', nameIt: 'Stacco', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.BACK, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES], secondaryMuscles: [MuscleGroup.CORE, MuscleGroup.FOREARMS], equipment: [Equipment.BARBELL], difficulty: ExerciseDifficulty.ADVANCED, instructions: ['Piedi larghezza fianchi sotto il bilanciere', 'Piega le ginocchia, afferra il bilanciere', 'Spingi il pavimento con i piedi, estendi anche le anche'], commonMistakes: ['Schiena non neutra', 'Bilanciere troppo lontano dal corpo', 'Tirare con la schiena invece di spingere i piedi'], variations: ['Stacco rumeno', 'Stacco sumo', 'Stacco con manubri'], progressions: ['Aggiungere 5kg a settimana'], regressions: ['Stacco con kettlebell', 'Good Morning'] },
  { name: 'Trazioni alla Sbarra', nameIt: 'Trazioni', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.BACK, MuscleGroup.BICEPS], secondaryMuscles: [MuscleGroup.SHOULDERS], equipment: [Equipment.PULL_UP_BAR], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['Impugna la sbarra con presa prona', 'Inizia da braccia estese', 'Porta il mento sopra la sbarra contraendo la schiena'], commonMistakes: ['Usare troppo i bicipiti', 'Non estendere completamente in basso', 'Oscillare il corpo'], variations: ['Presa supina (Chin-up)', 'Presa neutra', 'Assisted pull-up'], progressions: ['Aggiungere peso con cintura'], regressions: ['Lat Machine', 'Assisted pull-up con elastico'] },
  { name: 'Military Press', nameIt: 'Lento Avanti', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS], secondaryMuscles: [MuscleGroup.CORE], equipment: [Equipment.BARBELL], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['In piedi, bilanciere al petto', 'Spingi verticalmente sopra la testa', 'Tieni il core contratto per stabilità'], commonMistakes: ['Arcuare eccessivamente la schiena', 'Non lockare le braccia in cima', 'Spingere in avanti invece che verticale'], variations: ['Overhead press con manubri', 'Seduto', 'Arnold Press'], progressions: ['Aumentare 2.5kg a settimana'], regressions: ['Lateral raise', 'Press con manubri leggeri'] },
  { name: 'Curl con Bilanciere', nameIt: 'Curl Bilanciere', category: ExerciseCategory.ISOLATION, muscleGroups: [MuscleGroup.BICEPS], secondaryMuscles: [MuscleGroup.FOREARMS], equipment: [Equipment.BARBELL], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['In piedi, bilanciere in presa supina', 'Fletti il gomito portando il bilanciere verso le spalle', 'Scendi controllato'], commonMistakes: ['Dondolare il busto', 'Non scendere completamente', 'Usare troppo peso'], variations: ['Curl con manubri', 'Curl con cavo', 'Curl a martello'], progressions: ['Aumentare 2.5kg'], regressions: ['Curl con elastico'] },
  { name: 'Tricipiti ai Cavi', nameIt: 'Pushdown al Cavo', category: ExerciseCategory.ISOLATION, muscleGroups: [MuscleGroup.TRICEPS], secondaryMuscles: [], equipment: [Equipment.CABLE], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['In piedi davanti alla macchina a cavi', 'Tieni i gomiti fermi ai fianchi', 'Estendi le braccia verso il basso'], commonMistakes: ['Muovere i gomiti', 'Usare troppo peso', 'Non estendere completamente'], variations: ['Con corda', 'Presa inversa', 'Overhead extension'], progressions: ['Aumentare peso gradualmente'], regressions: ['Dips tra panche'] },
  { name: 'Leg Press', nameIt: 'Pressa', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.QUADS, MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS], secondaryMuscles: [], equipment: [Equipment.MACHINE], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['Siediti sulla leg press', 'Piedi larghezza fianchi sulla piattaforma', 'Spingi e torna controllato'], commonMistakes: ['Ginocchia che cedono', 'Range of motion troppo ridotto', 'Schiena che si alza dal sedile'], variations: ['Piedi alti', 'Piedi stretti', 'Unilaterale'], progressions: ['Aggiungere volume o carico'], regressions: ['Squat con peso corporeo'] },
  { name: 'Rematore con Bilanciere', nameIt: 'Rematore', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.BACK, MuscleGroup.BICEPS], secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.CORE], equipment: [Equipment.BARBELL], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['Busto inclinato a 45°, bilanciere in presa prona', 'Tira il bilanciere verso l\'ombelico', 'Contrai la schiena in cima'], commonMistakes: ['Usare lo slancio', 'Schiena non neutra', 'Range limitato'], variations: ['Presa supina', 'Con manubri', 'T-Bar row'], progressions: ['Aumentare carico'], regressions: ['Cable row seduto'] },
  { name: 'Romanian Deadlift', nameIt: 'Stacco Rumeno', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.BACK], secondaryMuscles: [MuscleGroup.CORE], equipment: [Equipment.BARBELL], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['In piedi con bilanciere', 'Mantieni le ginocchia leggermente flesse', 'Inclina il busto verso il basso facendo scivolare il bilanciere lungo le gambe'], commonMistakes: ['Piegare troppo le ginocchia', 'Schiena non neutra', 'Abbassare il bilanciere troppo'], variations: ['Con manubri', 'Single leg RDL', 'Sumo'], progressions: ['Aumentare carico'], regressions: ['Good Morning con bodyweight'] },
  { name: 'Lateral Raise', nameIt: 'Alzate Laterali', category: ExerciseCategory.ISOLATION, muscleGroups: [MuscleGroup.SHOULDERS], secondaryMuscles: [], equipment: [Equipment.DUMBBELL], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['In piedi con manubri ai lati', 'Alza le braccia lateralmente fino ad altezza spalle', 'Abbassa controllato'], commonMistakes: ['Usare troppo peso', 'Oscillare il corpo', 'Portare le braccia troppo in alto'], variations: ['Al cavo', 'Inclinato', 'Unilaterale'], progressions: ['Aumentare peso o volume'], regressions: ['Esercizio con elastico'] },
  { name: 'Hip Thrust', nameIt: 'Hip Thrust', category: ExerciseCategory.COMPOUND, muscleGroups: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS], secondaryMuscles: [MuscleGroup.CORE], equipment: [Equipment.BARBELL, Equipment.BENCH], difficulty: ExerciseDifficulty.INTERMEDIATE, instructions: ['Schiena sulla panca, bilanciere sui fianchi', 'Spingi i fianchi verso l\'alto contraendo i glutei', 'Abbassa controllato'], commonMistakes: ['Non estendere completamente i fianchi', 'Non contrarre i glutei in cima', 'Arco lombare eccessivo'], variations: ['Con manubrio', 'Single leg', 'Banded'], progressions: ['Aumentare carico'], regressions: ['Glute bridge a bodyweight'] },
  { name: 'Face Pull', nameIt: 'Face Pull', category: ExerciseCategory.ISOLATION, muscleGroups: [MuscleGroup.SHOULDERS, MuscleGroup.BACK], secondaryMuscles: [], equipment: [Equipment.CABLE], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['Cavo a livello testa con corda', 'Tira verso il viso aprendo i gomiti', 'Contrai le spalle posteriori'], commonMistakes: ['Peso troppo alto', 'Tirare troppo in basso', 'Non aprire i gomiti'], variations: ['Con elastico', 'Sovraprono'], progressions: ['Aumentare volume'], regressions: ['Rear delt fly con manubri'] },
  { name: 'Crunch alla Macchina', nameIt: 'Crunch', category: ExerciseCategory.ISOLATION, muscleGroups: [MuscleGroup.CORE], secondaryMuscles: [], equipment: [Equipment.MACHINE], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['Siediti alla macchina', 'Fletti il busto verso le ginocchia', 'Contrai l\'addome in cima'], commonMistakes: ['Usare il collo', 'Troppo slancio', 'Range limitato'], variations: ['Crunch a terra', 'Crunch al cavo', 'Crunch inverso'], progressions: ['Aggiungere peso'], regressions: ['Crunch a corpo libero'] },
  { name: 'Plank', nameIt: 'Plank', category: ExerciseCategory.ISOLATION, muscleGroups: [MuscleGroup.CORE], secondaryMuscles: [MuscleGroup.SHOULDERS], equipment: [Equipment.BODYWEIGHT], difficulty: ExerciseDifficulty.BEGINNER, instructions: ['Posizione di piegamenti sui gomiti', 'Corpo in linea retta', 'Mantieni per il tempo stabilito'], commonMistakes: ['Cedere i fianchi', 'Alzare i glutei', 'Non respirare'], variations: ['Side plank', 'Plank con alzata braccia', 'RKC plank'], progressions: ['Aumentare il tempo'], regressions: ['Plank sulle ginocchia'] },
];

const achievements = [
  { name: 'first-workout', nameIt: 'Prima Serie', description: 'Complete your first workout', descriptionIt: 'Completa il tuo primo allenamento', category: 'MILESTONE' as any, points: 100, rarity: 'COMMON' as any, criteria: { type: 'session_count', value: 1 } },
  { name: 'streak-7', nameIt: 'Streak 7 Giorni', description: '7-day workout streak', descriptionIt: '7 giorni consecutivi di allenamento', category: 'CONSISTENCY' as any, points: 250, rarity: 'RARE' as any, criteria: { type: 'streak', value: 7 } },
  { name: 'streak-30', nameIt: 'Streak 30 Giorni', description: '30-day workout streak', descriptionIt: '30 giorni consecutivi di allenamento', category: 'CONSISTENCY' as any, points: 1000, rarity: 'LEGENDARY' as any, criteria: { type: 'streak', value: 30 } },
  { name: 'first-pr', nameIt: 'Primo PR', description: 'Set your first personal record', descriptionIt: 'Primo record personale', category: 'STRENGTH' as any, points: 200, rarity: 'RARE' as any, criteria: { type: 'pr_count', value: 1 } },
  { name: 'sessions-10', nameIt: 'Decina', description: 'Complete 10 workouts', descriptionIt: 'Completa 10 allenamenti', category: 'MILESTONE' as any, points: 300, rarity: 'RARE' as any, criteria: { type: 'session_count', value: 10 } },
  { name: 'sessions-100', nameIt: 'Centenario', description: 'Complete 100 workouts', descriptionIt: '100 allenamenti completati', category: 'MILESTONE' as any, points: 2000, rarity: 'LEGENDARY' as any, criteria: { type: 'session_count', value: 100 } },
  { name: 'volume-1000', nameIt: 'Tonnellaggio', description: 'Lift 1 ton in a session', descriptionIt: '1 tonnellata sollevata in un allenamento', category: 'VOLUME' as any, points: 500, rarity: 'EPIC' as any, criteria: { type: 'session_volume', value: 1000 } },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: ex,
      create: ex,
    }).catch(() => {});
  }
  console.log(`✅ ${exercises.length} exercises seeded`);

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { name: ach.name },
      update: ach,
      create: ach,
    });
  }
  console.log(`✅ ${achievements.length} achievements seeded`);

  const foodItems = [
    { name: 'Pollo petto', calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, servingSize: 100, servingUnit: 'g' },
    { name: 'Riso bianco cotto', calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, servingSize: 100, servingUnit: 'g' },
    { name: 'Uova intere', calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11, servingSize: 100, servingUnit: 'g' },
    { name: 'Fiocchi d\'avena', calories: 389, proteinG: 17, carbsG: 66, fatG: 7, servingSize: 100, servingUnit: 'g' },
    { name: 'Whey protein', calories: 400, proteinG: 80, carbsG: 8, fatG: 4, servingSize: 100, servingUnit: 'g' },
    { name: 'Manzo macinato 5%', calories: 140, proteinG: 21, carbsG: 0, fatG: 6, servingSize: 100, servingUnit: 'g' },
    { name: 'Salmone', calories: 208, proteinG: 20, carbsG: 0, fatG: 13, servingSize: 100, servingUnit: 'g' },
    { name: 'Pasta integrale', calories: 337, proteinG: 14, carbsG: 63, fatG: 2.5, servingSize: 100, servingUnit: 'g' },
    { name: 'Banana', calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, servingSize: 100, servingUnit: 'g' },
    { name: 'Pane integrale', calories: 247, proteinG: 13, carbsG: 41, fatG: 3.4, servingSize: 100, servingUnit: 'g' },
    { name: 'Mozzarella', calories: 280, proteinG: 18, carbsG: 2, fatG: 22, servingSize: 100, servingUnit: 'g' },
    { name: 'Ricotta', calories: 174, proteinG: 11, carbsG: 3, fatG: 13, servingSize: 100, servingUnit: 'g' },
    { name: 'Latte intero', calories: 61, proteinG: 3.2, carbsG: 4.8, fatG: 3.3, servingSize: 100, servingUnit: 'ml' },
    { name: 'Olio d\'oliva', calories: 884, proteinG: 0, carbsG: 0, fatG: 100, servingSize: 10, servingUnit: 'ml' },
    { name: 'Tonno in acqua', calories: 116, proteinG: 26, carbsG: 0, fatG: 1, servingSize: 100, servingUnit: 'g' },
  ];

  for (const food of foodItems) {
    await prisma.foodItem.upsert({
      where: { barcode: food.name },
      update: {},
      create: { ...food, barcode: food.name },
    }).catch(() => {
      return prisma.foodItem.create({ data: food }).catch(() => {});
    });
  }
  console.log(`✅ ${foodItems.length} food items seeded`);

  console.log('🎉 Database seeding complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
