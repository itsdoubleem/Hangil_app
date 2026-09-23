// The app's own furniture, in two languages. Lesson explanations are written in
// English — see the note in Settings. This switches the chrome, not the teaching.
const S = {
  en: {
    today:'Today', course:'Course', exam:'Exam', review:'Review', me:'Settings',
    streak:'day streak', due:'due', reviewNow:'Review %n now', nothingDue:'Nothing due',
    carryOn:'Carry on where you left off', start:'Start', practice:'Practise this unit',
    letters:'The alphabet', vocab:'Vocabulary', listening:'Official listening',
    words:'words', units:'units', questions:'questions', minutes:'min',
    learned:'learned', correct:'answered right', best:'best streak',
    paper:'Practice paper', drills:'By question type', startPaper:'Start the paper',
    trades:'Your trade', trade:'Trade', guide:'How the exam works',
    tradeWords:'The words', tradeDrill:'Practise this trade', noTrade:'Not chosen',
    back:'Back', done:'Done', locked:'Read the unit first',
    about:'About', madeBy:'Made by %n',
  },
  ko: {
    today:'오늘', course:'공부', exam:'시험', review:'복습', me:'설정',
    streak:'일 연속', due:'복습 대기', reviewNow:'지금 %n개 복습', nothingDue:'오늘은 없습니다',
    carryOn:'이어서 하기', start:'시작', practice:'이 과 연습하기',
    letters:'한글', vocab:'단어', listening:'공식 듣기 자료',
    words:'단어', units:'과', questions:'문항', minutes:'분',
    learned:'배운 과', correct:'맞힌 문제', best:'최고 기록',
    paper:'모의고사', drills:'유형별 연습', startPaper:'시험 시작',
    trades:'업종별', trade:'업종', guide:'시험 안내',
    tradeWords:'단어', tradeDrill:'이 업종 연습하기', noTrade:'선택 안 함',
    back:'뒤로', done:'완료', locked:'먼저 설명을 읽으세요',
    about:'정보', madeBy:'만든 사람 %n',
  },
};
let lang = 'en';
export function setLang(l) { lang = S[l] ? l : 'en'; document.documentElement.lang = lang; }
export function t(k, n) {
  const s = (S[lang] && S[lang][k]) || S.en[k] || k;
  return n === undefined ? s : s.replace('%n', n);
}
export const current = () => lang;
