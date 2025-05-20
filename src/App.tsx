import React, { useState, useEffect } from 'react';
// @ts-ignore
import CryptoJS from 'crypto-js';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

type Question = {
  question_number: number;
  question: string;
  answers: { [key: string]: string };
  correct_answer: string;
  explanation?: string;
};

const sarcasticMessages = [
  "Wow, that was... not even close.",
  "Did you even read the question?",
  "Impressive! If we were grading for wrong answers.",
  "Are you just guessing at this point?",
  "Maybe try using your brain next time.",
  "That answer was so bad, even the computer is embarrassed.",
  "If sarcasm could fix answers, you'd be a genius by now.",
  "You might want to Google that next time.",
  "At least you're consistent. Consistently wrong.",
  "That answer was so wrong, it's almost right. Almost.",
  "Keep going! You can't get them all wrong... or can you?"
];

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
  padding: 32,
  maxWidth: 600,
  margin: '40px auto',
  fontFamily: 'Inter, Arial, sans-serif',
  textAlign: 'left',
};

const buttonStyle: React.CSSProperties = {
  fontSize: 18,
  padding: '12px 36px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(90deg, #4f8cff 0%, #2355d6 100%)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 16,
  boxShadow: '0 2px 8px 0 rgba(79,140,255,0.10)'
};

const answerBox: React.CSSProperties = {
  background: '#f6f8fa',
  borderRadius: 8,
  padding: '10px 16px',
  margin: '8px 0',
  display: 'flex',
  alignItems: 'center',
  fontSize: 17,
  cursor: 'pointer',
  border: '2px solid transparent',
  transition: 'border 0.2s',
};

const answerBoxSelected: React.CSSProperties = {
  ...answerBox,
  border: '2px solid #4f8cff',
  background: '#eaf1ff',
};

const explanationBox: React.CSSProperties = {
  marginTop: 18,
  background: '#eaf1ff',
  borderLeft: '5px solid #4f8cff',
  padding: 16,
  borderRadius: 8,
  color: '#234',
  fontSize: 16,
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const KNOWN_KEY = 'known_questions_v1';

function App() {
  const [key, setKey] = useState('');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'decrypt' | 'mode' | 'quiz' | 'summary'>('decrypt');
  const [current, setCurrent] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [sarcasticMsg, setSarcasticMsg] = useState('');
  const [knownQuestions, setKnownQuestions] = useState<number[]>([]);
  const [quizMode, setQuizMode] = useState<'sequential' | 'random'>('sequential');

  // Bilinen soruları localStorage'dan yükle
  useEffect(() => {
    const stored = localStorage.getItem(KNOWN_KEY);
    if (stored) {
      try {
        setKnownQuestions(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Sorular yüklendiğinde bilinenleri filtrele
  useEffect(() => {
    if (questions) {
      const filtered = questions.filter(q => !knownQuestions.includes(q.question_number));
      setFilteredQuestions(quizMode === 'random' ? shuffleArray(filtered) : filtered);
      setCurrent(0);
    }
  }, [questions, knownQuestions, quizMode]);

  const handleDecrypt = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('questions.enc');
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const salt = bytes.slice(0, 16);
      const iv = bytes.slice(16, 32);
      const ciphertext = bytes.slice(32);
      const saltWA = CryptoJS.lib.WordArray.create(salt);
      const ivWA = CryptoJS.lib.WordArray.create(iv);
      const ciphertextWA = CryptoJS.lib.WordArray.create(ciphertext);
      const keyWA = CryptoJS.PBKDF2(key, saltWA, {
        keySize: 256 / 32,
        iterations: 100000,
        hasher: CryptoJS.algo.SHA1
      });
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertextWA },
        keyWA,
        { iv: ivWA, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
      if (!jsonStr) throw new Error('Şifre yanlış veya dosya bozuk!');
      const parsed = JSON.parse(jsonStr);
      setQuestions(parsed);
      setStep('mode');
    } catch (e: any) {
      setError(e.message || 'Çözme başarısız!');
    }
    setLoading(false);
  };

  const handleMarkKnown = (qnum: number) => {
    if (!knownQuestions.includes(qnum)) {
      const updated = [...knownQuestions, qnum];
      setKnownQuestions(updated);
      localStorage.setItem(KNOWN_KEY, JSON.stringify(updated));
    }
  };

  if (step === 'decrypt') {
    return (
      <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, letterSpacing: -1 }}>Quiz Web Uygulaması</h1>
          <p style={{ fontSize: 18, color: '#234', marginBottom: 24 }}>Şifreli soruları görmek için anahtarı girin:</p>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Şifre (encryption key)"
            style={{ padding: 12, fontSize: 20, width: 280, borderRadius: 8, border: '1.5px solid #bcd', marginBottom: 16 }}
          />
          <br />
          <button onClick={handleDecrypt} disabled={loading || !key} style={{ ...buttonStyle, width: 220 }}>
            {loading ? 'Çözülüyor...' : 'Soruları Yükle'}
          </button>
          {error && <div style={{ color: 'red', marginTop: 20, fontWeight: 600 }}>{error}</div>}
        </div>
      </div>
    );
  }

  if (step === 'mode') {
    return (
      <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Quiz Başlangıcı</h2>
          <p style={{ fontSize: 18, marginBottom: 32 }}>Quiz sıralamasını seç:</p>
          <button style={{ ...buttonStyle, width: 220, marginRight: 16 }} onClick={() => { setQuizMode('sequential'); setStep('quiz'); }}>Sıralı Başlat</button>
          <button style={{ ...buttonStyle, width: 220, background: '#1dbf73' }} onClick={() => { setQuizMode('random'); setStep('quiz'); }}>Rastgele Başlat</button>
          <div style={{ marginTop: 32, color: '#888', fontSize: 16 }}>
            Bilinen sorular otomatik olarak atlanır.<br />
            <b>Kayıtlı bilinen soru:</b> {knownQuestions.length}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'quiz' && filteredQuestions) {
    if (filteredQuestions.length === 0) {
      return (
        <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Tebrikler!</h2>
            <p style={{ fontSize: 18 }}>Tüm soruları bildin veya işaretledin. 🎉</p>
            <button onClick={() => { setStep('mode'); setQuestions(questions); }} style={{ ...buttonStyle, width: 220 }}>Başa Dön</button>
          </div>
        </div>
      );
    }
    const q = filteredQuestions[current];
    const answerKeys = Object.keys(q.answers);
    return (
      <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2355d6', marginBottom: 8 }}>Soru {q.question_number}</div>
          <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 24 }}>{q.question}</div>
          <div style={{ marginBottom: 24 }}>
            {answerKeys.map(k => (
              <div
                key={k}
                style={userAnswer === k ? answerBoxSelected : answerBox}
                onClick={() => !showResult && setUserAnswer(k)}
              >
                <input
                  type="radio"
                  name="answer"
                  value={k}
                  checked={userAnswer === k}
                  onChange={() => setUserAnswer(k)}
                  disabled={showResult}
                  style={{ marginRight: 10 }}
                />
                <b style={{ minWidth: 24, display: 'inline-block' }}>{k}:</b> {q.answers[k]}
              </div>
            ))}
          </div>
          {!showResult && (
            <button
              onClick={() => {
                setShowResult(true);
                const correct = userAnswer === q.correct_answer;
                setIsCorrect(correct);
                if (correct) setCorrectCount(c => c + 1);
                else {
                  setWrongCount(w => w + 1);
                  const msg = sarcasticMessages[Math.floor(Math.random() * sarcasticMessages.length)];
                  setSarcasticMsg(msg);
                }
              }}
              disabled={!userAnswer}
              style={{ ...buttonStyle, width: 200, background: '#4f8cff' }}
            >
              Cevabı Gönder
            </button>
          )}
          {showResult && (
            <div style={{ marginTop: 32 }}>
              {isCorrect ? (
                <div style={{ color: '#1dbf73', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>✅ Doğru!</div>
              ) : (
                <>
                  <div style={{ color: '#e74c3c', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>❌ Yanlış! Doğru cevap: {q.correct_answer}</div>
                  <div style={{ color: '#b36b00', fontWeight: 600, fontSize: 17, marginBottom: 12, fontStyle: 'italic' }}>{sarcasticMsg}</div>
                </>
              )}
              <div style={explanationBox}>
                <b>Açıklama:</b> {q.explanation || 'Açıklama yok.'}
              </div>
              <div style={{ marginTop: 18, textAlign: 'right' }}>
                <button
                  style={{ ...buttonStyle, width: 180, background: '#1dbf73', marginRight: 12 }}
                  onClick={() => {
                    handleMarkKnown(q.question_number);
                    setShowResult(false);
                    setUserAnswer('');
                    setIsCorrect(null);
                    setSarcasticMsg('');
                    if (current + 1 < filteredQuestions.length) {
                      setCurrent(current + 1);
                    } else {
                      setStep('summary');
                    }
                  }}
                >
                  Bildiğim Soru (Listeden Çıkar)
                </button>
                <button
                  style={{ ...buttonStyle, width: 180, background: '#2355d6' }}
                  onClick={() => {
                    setShowResult(false);
                    setUserAnswer('');
                    setIsCorrect(null);
                    setSarcasticMsg('');
                    if (current + 1 < filteredQuestions.length) {
                      setCurrent(current + 1);
                    } else {
                      setStep('summary');
                    }
                  }}
                >
                  {current + 1 < filteredQuestions.length ? 'Sonraki Soru' : 'Quiz Sonu'}
                </button>
              </div>
            </div>
          )}
          <div style={{ marginTop: 32, color: '#888', fontSize: 16, textAlign: 'right' }}>
            Soru {current + 1} / {filteredQuestions.length}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'summary' && filteredQuestions) {
    const total = correctCount + wrongCount;
    const percent = total > 0 ? ((correctCount / total) * 100).toFixed(2) : '0.00';
    return (
      <div style={{ minHeight: '100vh', background: '#f6f8fa' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#2355d6' }}>Quiz Sonu</h2>
          <div style={{ fontSize: 22, margin: 24 }}>
            ✅ Doğru: <b style={{ color: '#1dbf73' }}>{correctCount}</b> <br />
            ❌ Yanlış: <b style={{ color: '#e74c3c' }}>{wrongCount}</b> <br />
            <b>Başarı Oranı: {percent}%</b>
          </div>
          <button onClick={() => { setStep('mode'); setCorrectCount(0); setWrongCount(0); setUserAnswer(''); setIsCorrect(null); setSarcasticMsg(''); }} style={{ ...buttonStyle, width: 200, background: '#4f8cff' }}>
            Tekrar Başla
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
