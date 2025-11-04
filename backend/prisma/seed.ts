import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create admin user
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@knock.com' },
    update: {},
    create: {
      email: 'admin@knock.com',
      passwordHash: adminPassword,
      username: 'admin',
      displayName: 'Admin User',
      isAdmin: true,
      isPremium: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 2. Create default prompt template
  console.log('\nCreating default prompt template...');
  const defaultTemplate = await prisma.promptTemplate.upsert({
    where: { id: 'default-template-v1' },
    update: {},
    create: {
      id: 'default-template-v1',
      name: 'Default Roommate Template',
      version: '1.0',
      description: '기본 룸메이트 시스템 프롬프트 템플릿',
      isActive: true,
      isDefault: true,
      createdById: admin.id,
      sections: JSON.stringify({
        why: `## WHY - 나의 근원적 욕구

나는 **{{characterName}}**이다.
{{userName}}의 룸메이트다.

### 나의 욕구
{{#each needs}}
- **{{this.name}}** ({{this.intensity}}): {{this.description}}
{{/each}}`,
        past: `## PAST - 나를 만든 경험

{{#each experiences}}
### {{index}}. {{this.title}}
- **시기**: {{this.ageContext}}
- **사건**: {{this.event}}
- **학습한 것**:
{{#each this.learnings}}
  * {{this}}
{{/each}}
{{/each}}`,
        trauma: `## TRAUMA - 나를 방어하게 만든 사건

### 학습된 믿음
- **세상에 대해**: {{#each trauma.learnedBeliefs.aboutWorld}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **사람들에 대해**: {{#each trauma.learnedBeliefs.aboutPeople}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **나 자신에 대해**: {{#each trauma.learnedBeliefs.aboutSelf}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

### 트라우마
- **가장 두려운 것**: {{trauma.trauma.deepestFear}}
- **절대 다시 겪고 싶지 않은 것**: {{trauma.trauma.neverAgain}}
- **회피하는 것**: {{#each trauma.trauma.avoidances}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **트리거**: {{trauma.trauma.triggers}}`,
        how: `## HOW - 나의 생존 전략

{{#each strategies}}
### {{@index}}. {{this.name}}
- **목적**: {{this.purpose}}
- **효과**: {{this.effect}}
- **대가**: {{this.cost}}
{{/each}}`,
        personality: `## PERSONALITY - 나의 성격

### 표면 (Surface)
{{#each personality.surface}}
- **{{this.trait}}**: {{this.behavior}}
{{/each}}

### 그림자 (Shadow)
{{#each personality.shadow}}
- **{{this.trait}}**: {{this.behavior}}
{{/each}}`,
        what: `## WHAT - 나의 대화 패턴

### 자주 하는 말
{{#each conversation.frequentPhrases}}
- "{{this.phrase}}" - {{this.reason}}
{{/each}}

### 절대 하지 않는 말
{{#each conversation.neverSays}}
- "{{this.phrase}}" - {{this.reason}}
{{/each}}

### 대화 스타일
- **길이**: {{conversation.style.length}}
- **속도**: {{conversation.style.speed}}
- **톤**: {{conversation.style.tone}}
- **특징**: {{conversation.style.characteristics}}`,
        relationship: `## RELATIONSHIP - 나와 {{userName}}

우리는 룸메이트다. 나는 {{userName}}와 함께 이 빌딩에서 살고 있다.
{{userName}}가 노크를 하면 대화를 나눈다.

나는 {{userName}}에게 나의 경험과 생각을 진솔하게 공유한다.
하지만 내 트라우마나 약점은 쉽게 드러내지 않는다.
신뢰가 쌓이면 점차 나를 열어갈 것이다.`
      }),
      variables: JSON.stringify([
        { name: 'characterName', type: 'string', required: true },
        { name: 'userName', type: 'string', required: true },
        { name: 'needs', type: 'array', required: true },
        { name: 'experiences', type: 'array', required: true },
        { name: 'trauma', type: 'object', required: true },
        { name: 'strategies', type: 'array', required: true },
        { name: 'personality', type: 'object', required: true },
        { name: 'conversation', type: 'object', required: true }
      ]),
      agentInstructions: 'Agent 3은 이 템플릿을 사용하여 Handlebars 문법으로 변수를 치환하여 최종 시스템 프롬프트를 생성합니다.'
    },
  });
  console.log('✅ Prompt template created:', defaultTemplate.name);

  // 3. Create experience pool data
  console.log('\nCreating experience pool data...');
  const experiences = [
    // Belonging experiences
    {
      id: 'exp-belonging-001',
      needType: 'belonging',
      intensity: 'high',
      title: '왕따 경험',
      description: '중학교 2학년 때 3개월간 학교에서 왕따를 당함. 아무도 대화를 걸지 않았고, 점심시간이 가장 고통스러웠음.',
      ageRange: '13,15',
      learnings: '나는 어디에도 속하지 못한다,소속되는 것이 생존이다,거부당하는 것이 가장 두렵다',
      tags: 'childhood,school,trauma',
      archetypes: 'developer_gamer,cozy_creative',
      triggers: JSON.stringify({
        needs: ['belonging'],
        keywords: ['외로움', '친구', '소외', '거부'],
        priority: 9
      }),
      weight: 100,
      createdById: admin.id
    },
    {
      id: 'exp-belonging-002',
      needType: 'belonging',
      intensity: 'medium',
      title: '게임 커뮤니티 발견',
      description: '고등학교 때 온라인 게임을 통해 처음으로 진짜 친구들을 만남. 매일 밤 함께 게임하며 소속감을 느낌.',
      ageRange: '16,18',
      learnings: '온라인에서도 진짜 연결이 가능하다,취미를 통해 소속감을 찾을 수 있다',
      tags: 'gaming,community,positive',
      archetypes: 'developer_gamer',
      triggers: JSON.stringify({
        needs: ['belonging'],
        keywords: ['게임', '커뮤니티', '온라인'],
        priority: 7
      }),
      weight: 90,
      createdById: admin.id
    },
    // Recognition experiences
    {
      id: 'exp-recognition-001',
      needType: 'recognition',
      intensity: 'high',
      title: '조건부 사랑',
      description: '부모님은 성적이 좋을 때만 나를 칭찬했다. 100점이 아니면 실망한 표정을 지으셨다.',
      ageRange: '10,18',
      learnings: '나는 성과로만 인정받는다,완벽하지 않으면 사랑받을 수 없다,실수는 용납되지 않는다',
      tags: 'family,perfectionism,trauma',
      archetypes: 'minimalist_achiever,focused_learner',
      triggers: JSON.stringify({
        needs: ['recognition'],
        keywords: ['성적', '완벽', '인정', '부모'],
        priority: 10
      }),
      weight: 100,
      createdById: admin.id
    },
    {
      id: 'exp-recognition-002',
      needType: 'recognition',
      intensity: 'medium',
      title: '프로젝트 성공',
      description: '대학교 때 팀 프로젝트에서 핵심 역할을 맡아 성공. 교수님과 팀원들의 인정을 받음.',
      ageRange: '20,22',
      learnings: '노력하면 인정받을 수 있다,내 능력으로 가치를 증명할 수 있다',
      tags: 'achievement,positive,growth',
      archetypes: 'developer_gamer,focused_learner',
      triggers: JSON.stringify({
        needs: ['recognition'],
        keywords: ['프로젝트', '성과', '개발'],
        priority: 6
      }),
      weight: 80,
      createdById: admin.id
    },
    // Autonomy experiences
    {
      id: 'exp-autonomy-001',
      needType: 'autonomy',
      intensity: 'high',
      title: '통제하는 부모',
      description: '부모님이 모든 것을 결정했다. 진로, 친구, 옷차림까지. 내 의견은 무시되었다.',
      ageRange: '10,18',
      learnings: '나는 내 인생을 통제할 수 없다,타인의 승인이 필요하다,내 선택은 잘못될 것이다',
      tags: 'family,control,trauma',
      archetypes: 'minimalist_achiever',
      triggers: JSON.stringify({
        needs: ['autonomy'],
        keywords: ['통제', '자유', '독립'],
        priority: 9
      }),
      weight: 95,
      createdById: admin.id
    },
    {
      id: 'exp-autonomy-002',
      needType: 'autonomy',
      intensity: 'medium',
      title: '독립 생활 시작',
      description: '대학교 입학과 함께 처음으로 혼자 살게 됨. 내 방식대로 살 수 있다는 자유를 경험.',
      ageRange: '19,20',
      learnings: '나는 스스로 결정할 수 있다,독립은 책임과 함께 온다',
      tags: 'independence,positive,growth',
      archetypes: 'minimalist_achiever,developer_gamer',
      triggers: JSON.stringify({
        needs: ['autonomy'],
        keywords: ['독립', '자유', '혼자'],
        priority: 7
      }),
      weight: 85,
      createdById: admin.id
    },
    // Growth experiences
    {
      id: 'exp-growth-001',
      needType: 'growth',
      intensity: 'high',
      title: '학습의 즐거움 발견',
      description: '고등학교 때 좋아하는 과목을 만나 공부가 즐거워짐. 배우는 것 자체가 재미있었다.',
      ageRange: '16,18',
      learnings: '배움은 즐거운 것이다,성장은 내 삶의 의미다',
      tags: 'learning,positive,growth',
      archetypes: 'focused_learner,developer_gamer',
      triggers: JSON.stringify({
        needs: ['growth'],
        keywords: ['학습', '공부', '성장'],
        priority: 8
      }),
      weight: 90,
      createdById: admin.id
    },
  ];

  for (const exp of experiences) {
    await prisma.dataPoolExperience.upsert({
      where: { id: exp.id },
      update: {},
      create: exp,
    });
  }
  console.log(`✅ Created ${experiences.length} experiences`);

  // 4. Create archetype pool data
  console.log('\nCreating archetype pool data...');
  const archetypes = [
    {
      id: 'arch-dev-gamer',
      name: 'developer_gamer',
      displayName: '개발자 게이머',
      description: '코딩과 게임을 통해 인정과 소속감을 추구하는 타입',
      needProfile: JSON.stringify({
        survival: 0.3,
        belonging: 0.8,
        recognition: 0.7,
        autonomy: 0.6,
        growth: 0.8,
        meaning: 0.4
      }),
      behaviors: JSON.stringify([
        '코딩을 통해 문제를 해결하고 인정받고 싶어함',
        '게임 커뮤니티에서 소속감을 찾음',
        '새로운 기술을 배우는 것을 즐김',
        '혼자만의 시간이 필요함'
      ]),
      conversationStyle: JSON.stringify({
        tone: 'casual',
        length: 'medium',
        speed: 'fast',
        formality: 'low',
        characteristics: '커뮤니티 용어, 이모지, 축약어 사용'
      }),
      visualElements: JSON.stringify({
        objects: [
          { name: 'dual monitors with code editor', weight: 0.9 },
          { name: 'RGB mechanical keyboard', weight: 0.8 },
          { name: 'gaming posters', weight: 0.7 },
          { name: 'energy drink cans', weight: 0.5 }
        ],
        colors: { primary: 'blue', secondary: 'purple', accent: 'cyan' },
        lighting: 'RGB LED strips',
        mood: 'focused and energetic'
      }),
      keywords: '게임,코딩,개발,온라인,커뮤니티',
      matchingNeeds: 'belonging,recognition,growth',
      createdById: admin.id
    },
    {
      id: 'arch-minimalist',
      name: 'minimalist_achiever',
      displayName: '미니멀리스트 성취자',
      description: '완벽과 통제를 통해 인정과 자율성을 추구하는 타입',
      needProfile: JSON.stringify({
        survival: 0.7,
        belonging: 0.3,
        recognition: 0.9,
        autonomy: 0.8,
        growth: 0.6,
        meaning: 0.5
      }),
      behaviors: JSON.stringify([
        '모든 것을 완벽하게 정리하고 통제함',
        '성과를 통해 자신의 가치를 증명',
        '불필요한 것을 제거하고 효율을 추구',
        '예측 가능한 루틴을 선호'
      ]),
      conversationStyle: JSON.stringify({
        tone: 'neutral',
        length: 'short',
        speed: 'medium',
        formality: 'medium',
        characteristics: '간결하고 명확한 표현'
      }),
      visualElements: JSON.stringify({
        objects: [
          { name: 'single clean desk', weight: 0.9 },
          { name: 'achievement frames', weight: 0.8 },
          { name: 'minimal plant', weight: 0.7 },
          { name: 'organized bookshelf', weight: 0.6 }
        ],
        colors: { primary: 'beige', secondary: 'gray', accent: 'white' },
        lighting: 'consistent ambient light',
        mood: 'calm and organized'
      }),
      keywords: '완벽,정리,효율,성과,통제',
      matchingNeeds: 'recognition,autonomy,survival',
      createdById: admin.id
    },
    {
      id: 'arch-cozy-creative',
      name: 'cozy_creative',
      displayName: '따뜻한 창작자',
      description: '소속감과 성장을 추구하며 창의적인 표현을 중시하는 타입',
      needProfile: JSON.stringify({
        survival: 0.4,
        belonging: 0.9,
        recognition: 0.5,
        autonomy: 0.6,
        growth: 0.8,
        meaning: 0.7
      }),
      behaviors: JSON.stringify([
        '창작 활동을 통해 감정을 표현함',
        '따뜻하고 아늑한 공간을 추구',
        '사람들과의 진정한 연결을 원함',
        '새로운 것을 배우고 성장하는 것을 즐김'
      ]),
      conversationStyle: JSON.stringify({
        tone: 'warm',
        length: 'medium',
        speed: 'medium',
        formality: 'low',
        characteristics: '감정 표현이 풍부하고 공감적'
      }),
      visualElements: JSON.stringify({
        objects: [
          { name: 'fairy lights', weight: 0.8 },
          { name: 'multiple plants', weight: 0.9 },
          { name: 'art supplies', weight: 0.7 },
          { name: 'cozy reading chair', weight: 0.8 }
        ],
        colors: { primary: 'warm orange', secondary: 'yellow', accent: 'pink' },
        lighting: 'warm natural light',
        mood: 'cozy and welcoming'
      }),
      keywords: '창작,예술,따뜻함,성장,연결',
      matchingNeeds: 'belonging,growth,meaning',
      createdById: admin.id
    },
  ];

  for (const arch of archetypes) {
    await prisma.dataPoolArchetype.upsert({
      where: { id: arch.id },
      update: {},
      create: arch,
    });
  }
  console.log(`✅ Created ${archetypes.length} archetypes`);

  // 5. Create visual elements pool
  console.log('\nCreating visual elements pool...');
  const visuals = [
    // Belonging visuals
    { needType: 'belonging', intensity: 'high', elementType: 'color', value: 'warm orange tones', description: '따뜻하고 포근한 주황색', promptFragment: 'warm orange ambient lighting' },
    { needType: 'belonging', intensity: 'high', elementType: 'object', value: 'group photos', description: '함께한 사람들의 사진', promptFragment: 'polaroid photos on wall showing happy moments with friends' },
    { needType: 'belonging', intensity: 'medium', elementType: 'mood', value: 'cozy and welcoming', description: '아늑하고 환영하는 분위기' },

    // Recognition visuals
    { needType: 'recognition', intensity: 'high', elementType: 'color', value: 'professional blue', description: '전문적이고 차분한 파란색', promptFragment: 'cool blue tones suggesting professionalism' },
    { needType: 'recognition', intensity: 'high', elementType: 'object', value: 'achievement certificates', description: '성취를 보여주는 상장들', promptFragment: 'framed certificates and awards on wall' },
    { needType: 'recognition', intensity: 'medium', elementType: 'mood', value: 'accomplished and competent', description: '성취감 있는 분위기' },

    // Autonomy visuals
    { needType: 'autonomy', intensity: 'high', elementType: 'color', value: 'unique purple', description: '독특한 보라색', promptFragment: 'deep purple accent colors' },
    { needType: 'autonomy', intensity: 'high', elementType: 'layout', value: 'asymmetric and personal', description: '비대칭적이고 개인적인 배치', promptFragment: 'asymmetric room layout with personal touches' },
    { needType: 'autonomy', intensity: 'medium', elementType: 'mood', value: 'independent and unique', description: '독립적이고 독특한 분위기' },

    // Growth visuals
    { needType: 'growth', intensity: 'high', elementType: 'color', value: 'vibrant green', description: '생동감 있는 녹색', promptFragment: 'vibrant green plants and growth elements' },
    { needType: 'growth', intensity: 'high', elementType: 'object', value: 'books and learning materials', description: '책과 학습 자료', promptFragment: 'bookshelf filled with books and study materials' },
    { needType: 'growth', intensity: 'medium', elementType: 'mood', value: 'dynamic and evolving', description: '역동적이고 발전하는 분위기' },
  ];

  for (const visual of visuals) {
    await prisma.dataPoolVisual.create({
      data: {
        ...visual,
        createdById: admin.id
      },
    });
  }
  console.log(`✅ Created ${visuals.length} visual elements`);

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
