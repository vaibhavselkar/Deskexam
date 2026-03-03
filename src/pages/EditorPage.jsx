import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Plus, Trash2, Download, Save, Eye, EyeOff, Image,
  ChevronDown, X, Loader2, FileCode,
} from 'lucide-react';
import Navbar from '../components/auth/Navbar';
import PdfPreview from '../components/editor/PdfPreview';
import { LatexInput } from '../components/editor/LatexRenderer';
import LatexFormatModal from '../components/editor/LatexFormatModal';
import PaywallModal from '../components/payment/PaywallModal';
import { useAuth } from '../hooks/useAuth';
import { savePaper, getPaper, decrementCredit, incrementPaperCount } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Science', 'Computer Science'];

const emptyQuestion = () => ({
  id: uuidv4(),
  type: 'MCQ',
  question: '',
  options: ['', '', '', ''],
  answer: '',
  marks: 1,
  imageUrl: null,
});

// ─── Template Presets ─────────────────────────────────────────────────────────
// Each entry maps a templateId → { title, metadata, questions, template }

const q = (type, question, options, answer, marks) => ({
  id: uuidv4(), type, question, options: options || ['', '', '', ''], answer: answer || '', marks: marks || 1, imageUrl: null,
});

const TEMPLATE_PRESETS = {
  'cbse-standard': {
    title: 'CBSE Board Examination – Mathematics',
    metadata: {
      instituteName: 'Kendriya Vidyalaya',
      teacherName: '',
      subject: 'Mathematics',
      className: 'Class X',
      maxMarks: 80,
      timeDuration: '3 Hours',
    },
    template: { accentColor: '#1a365d', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'The HCF of 26 and 91 is:', ['13', '26', '91', '1'], 'A', 1),
      q('MCQ', 'The roots of the equation x² – 3x – 10 = 0 are:', ['2 and –5', '5 and –2', '–2 and –5', '2 and 5'], 'B', 1),
      q('MCQ', 'In an AP, if a = 1 and d = 2, the 10th term is:', ['19', '20', '21', '18'], 'A', 1),
      q('Subjective', 'Prove that √2 is irrational.', [], '', 3),
      q('Subjective', 'Find the zeros of the polynomial p(x) = x² – 5x + 6 and verify the relationship between its zeros and coefficients.', [], '', 3),
      q('Subjective', 'Solve the following pair of linear equations by substitution method: 2x + 3y = 11 and 2x – 4y = –24.', [], '', 4),
    ],
  },

  'jee-mock': {
    title: 'JEE Main Mock Test – Paper 1 (PCM)',
    metadata: {
      instituteName: 'JEE Preparation Center',
      teacherName: '',
      subject: 'Physics, Chemistry & Mathematics',
      className: 'Class XII / Dropper',
      maxMarks: 300,
      timeDuration: '3 Hours',
    },
    template: { accentColor: '#dc2626', fontFamily: 'Arial' },
    questions: [
      q('MCQ', '[Physics] A particle moves in a circle of radius R. The displacement after half a circle is:', ['0', 'πR', '2R', '2πR'], 'C', 4),
      q('MCQ', '[Physics] Which of the following has the highest resistivity at room temperature?', ['Copper', 'Silver', 'Silicon', 'Aluminium'], 'C', 4),
      q('MCQ', '[Chemistry] The IUPAC name of CH₃–CH(OH)–CH₃ is:', ['Propan-1-ol', 'Propan-2-ol', '1-methylethanol', '2-propanol'], 'B', 4),
      q('MCQ', '[Chemistry] Hybridisation of nitrogen in NH₃ is:', ['sp', 'sp²', 'sp³', 'sp³d'], 'C', 4),
      q('MCQ', '[Mathematics] If f(x) = x² and g(x) = √x, then fog(x) is:', ['x', 'x²', '√x', 'x⁴'], 'A', 4),
      q('Subjective', '[Mathematics] Find the value of k such that the quadratic equation kx² + 6x + 1 = 0 has equal roots. (Integer type answer)', [], '', 4),
    ],
  },

  'weekly-test': {
    title: 'Weekly Class Test',
    metadata: {
      instituteName: '',
      teacherName: '',
      subject: 'Science',
      className: 'Class VIII',
      maxMarks: 20,
      timeDuration: '45 Minutes',
    },
    template: { accentColor: '#2563eb', fontFamily: 'Arial' },
    questions: [
      q('MCQ', 'Which gas is released during photosynthesis?', ['CO₂', 'O₂', 'N₂', 'H₂'], 'B', 1),
      q('MCQ', 'The SI unit of force is:', ['Joule', 'Watt', 'Newton', 'Pascal'], 'C', 1),
      q('True/False', 'Sound travels faster in air than in water.', [], 'False', 1),
      q('True/False', 'The nucleus is the control centre of the cell.', [], 'True', 1),
      q('Subjective', 'Define Newton\'s First Law of Motion with one example.', [], '', 3),
      q('Subjective', 'What are the differences between plant cells and animal cells? (Any two points)', [], '', 3),
    ],
  },

  'neet-mock': {
    title: 'NEET Mock Test',
    metadata: {
      instituteName: 'Medical Entrance Coaching',
      teacherName: '',
      subject: 'Biology',
      className: 'Class XII / NEET Aspirant',
      maxMarks: 720,
      timeDuration: '3 Hours 20 Minutes',
    },
    template: { accentColor: '#16a34a', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', '[Biology] Which of the following is NOT a characteristic of living organisms?', ['Growth', 'Reproduction', 'Crystallisation', 'Metabolism'], 'C', 4),
      q('MCQ', '[Biology] The functional unit of the kidney is:', ['Nephron', 'Neuron', 'Lobule', 'Alveolus'], 'A', 4),
      q('MCQ', '[Physics] The momentum of a 10 kg object moving at 5 m/s is:', ['2 kg·m/s', '50 kg·m/s', '0.5 kg·m/s', '15 kg·m/s'], 'B', 4),
      q('MCQ', '[Chemistry] Atomic number of Carbon is:', ['6', '8', '12', '14'], 'A', 4),
      q('MCQ', '[Biology] DNA replication is:', ['Semi-conservative', 'Conservative', 'Dispersive', 'None of these'], 'A', 4),
      q('MCQ', '[Biology] Photosynthesis occurs in:', ['Mitochondria', 'Ribosome', 'Chloroplast', 'Nucleus'], 'C', 4),
    ],
  },

  'colorful-kids': {
    title: 'Fun Science Quiz 🌈',
    metadata: {
      instituteName: 'Sunshine Primary School',
      teacherName: '',
      subject: 'Science',
      className: 'Class III',
      maxMarks: 25,
      timeDuration: '1 Hour',
    },
    template: { accentColor: '#7c3aed', fontFamily: 'Arial' },
    questions: [
      q('MCQ', 'How many legs does a spider have?', ['4', '6', '8', '10'], 'C', 2),
      q('MCQ', 'What do plants use to make their own food?', ['Soil and water only', 'Sunlight, water and CO₂', 'Fertiliser', 'Rain'], 'B', 2),
      q('True/False', 'The Sun is a planet.', [], 'False', 1),
      q('True/False', 'Fish breathe using gills.', [], 'True', 1),
      q('Subjective', 'Name any two animals that live in water. 🐠', [], '', 2),
      q('Subjective', 'Draw and label the parts of a flower. 🌸', [], '', 3),
    ],
  },

  'olympiad': {
    title: 'Mathematics Olympiad',
    metadata: {
      instituteName: 'Mathematics Olympiad Foundation',
      teacherName: '',
      subject: 'Mathematics',
      className: 'Class IX–X',
      maxMarks: 100,
      timeDuration: '3 Hours',
    },
    template: { accentColor: '#b45309', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'The number of prime numbers between 1 and 100 is:', ['24', '25', '26', '27'], 'B', 5),
      q('MCQ', 'If a + b = 10 and ab = 21, then a² + b² equals:', ['58', '16', '100', '42'], 'A', 5),
      q('Subjective', 'Prove that for any integer n, the expression n³ – n is divisible by 6.', [], '', 10),
      q('Subjective', 'In triangle ABC, angle A = 90°. If AB = 5 cm and BC = 13 cm, find AC and the area of triangle ABC.', [], '', 10),
      q('Subjective', 'Find all integer solutions to the equation x² – y² = 35.', [], '', 10),
    ],
  },

  'coaching-premium': {
    title: 'Topic Assessment Test',
    metadata: {
      instituteName: 'Excellence Coaching Institute',
      teacherName: '',
      subject: 'Physics',
      className: 'Class XI',
      maxMarks: 100,
      timeDuration: '2 Hours',
    },
    template: { accentColor: '#0f766e', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'A body is thrown vertically upward with velocity u. The maximum height attained is:', ['u/g', 'u²/2g', 'u²/g', '2u²/g'], 'B', 4),
      q('MCQ', 'Newton\'s law of cooling states that rate of cooling is proportional to:', ['Temperature of body', 'Difference in temperatures', 'Time elapsed', 'Thermal conductivity'], 'B', 4),
      q('MCQ', 'The dimension of coefficient of viscosity is:', ['ML⁻¹T⁻¹', 'M⁰LT⁻²', 'MLT⁻²', 'M⁰L²T⁻¹'], 'A', 4),
      q('Subjective', 'Derive the equation of motion v = u + at from first principles.', [], '', 8),
      q('Subjective', 'A car accelerates from rest at 2 m/s². Calculate (i) velocity after 10 s, and (ii) distance covered in 10 s.', [], '', 8),
    ],
  },

  'formal-collegiate': {
    title: 'End Semester Examination',
    metadata: {
      instituteName: 'Department of Physics & Mathematics',
      teacherName: '',
      subject: 'Mathematics',
      className: 'B.Sc. Second Year',
      maxMarks: 100,
      timeDuration: '3 Hours',
    },
    template: { accentColor: '#1e3a5f', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'A linear transformation T: R² → R² defined by T(x, y) = (x + y, x – y) is:', ['Neither injective nor surjective', 'Injective but not surjective', 'Surjective but not injective', 'Bijective'], 'D', 5),
      q('Subjective', 'State and prove the Fundamental Theorem of Calculus (Part I).', [], '', 15),
      q('Subjective', 'Find the eigenvalues and corresponding eigenvectors of the matrix A = [[2,1],[1,2]].', [], '', 15),
      q('Subjective', 'Evaluate the integral ∫₀¹ x²·e^x dx using integration by parts.', [], '', 15),
    ],
  },

  'icse-standard': {
    title: 'ICSE Board Examination – Mathematics',
    metadata: {
      instituteName: 'Council for the Indian School Certificate Examinations',
      teacherName: '',
      subject: 'Mathematics',
      className: 'Class X',
      maxMarks: 80,
      timeDuration: '2½ Hours',
    },
    template: { accentColor: '#1a1a2e', fontFamily: 'Times New Roman' },
    questions: [
      q('MCQ', 'If the mean of 5 observations x, x+2, x+4, x+6, x+8 is 11, then the value of x is:', ['7', '8', '9', '10'], 'A', 2),
      q('MCQ', 'The angle of elevation of the top of a tower 30 m high from a point on the ground 30√3 m away is:', ['30°', '45°', '60°', '90°'], 'A', 2),
      q('Subjective', 'Using factor theorem, show that (x – 2) is a factor of x³ – 3x² + 4. Hence factorise the polynomial completely.', [], '', 5),
      q('Subjective', 'The following table shows the ages of 100 students of a school. Find the mean age. Age (years): 10, 11, 12, 13, 14. No. of students: 15, 22, 30, 18, 15.', [], '', 5),
      q('Subjective', 'In a right triangle ABC, right-angled at B, if tan A = 1/√3, find the value of: (i) sin A · cos C + cos A · sin C', [], '', 4),
    ],
  },

  'chapter-test': {
    title: 'Chapter Test – Triangles',
    metadata: {
      instituteName: '',
      teacherName: '',
      subject: 'Mathematics',
      className: 'Class IX',
      maxMarks: 25,
      timeDuration: '40 Minutes',
    },
    template: { accentColor: '#0369a1', fontFamily: 'Arial' },
    questions: [
      q('MCQ', 'Two triangles are congruent if two angles and the included side of one triangle are equal to:', ['Any two sides and one angle', 'Two angles and included side of the other', 'Three sides of the other', 'Two sides and any angle'], 'B', 1),
      q('MCQ', 'In △ABC, if AB = AC, then the angles opposite to them are:', ['Unequal', 'Complementary', 'Equal', 'Supplementary'], 'C', 1),
      q('True/False', 'A triangle can have two right angles.', [], 'False', 1),
      q('Subjective', 'State and prove the Angle Sum Property of a triangle.', [], '', 4),
      q('Subjective', 'In △PQR, PQ = PR. A line through P bisects angle QPR and meets QR at M. Prove that △PQM ≅ △PRM.', [], '', 5),
    ],
  },

  'pro-custom': {
    title: 'Custom Question Paper',
    metadata: {
      instituteName: '',
      teacherName: '',
      subject: 'Mathematics',
      className: 'Class X',
      maxMarks: 100,
      timeDuration: '3 Hours',
    },
    template: { accentColor: '#6d28d9', fontFamily: 'Times New Roman' },
    questions: [emptyQuestion()],
  },
};

// ─── Paged A4 Preview ────────────────────────────────────────────────────────
// Shows the paper as individual A4 page cards (like a PDF viewer),
// so the user sees exactly how the downloaded PDF will look.

const A4_W_PX = Math.round(210 * 96 / 25.4); // 210 mm at 96 dpi ≈ 794 px
const A4_H_PX = Math.round(297 * 96 / 25.4); // 297 mm at 96 dpi ≈ 1123 px
const PREVIEW_SCALE  = 0.65;
const PAGE_DISPLAY_W = Math.round(A4_W_PX * PREVIEW_SCALE); // ≈ 516 px
const PAGE_DISPLAY_H = Math.round(A4_H_PX * PREVIEW_SCALE); // ≈ 730 px — full A4 card height
const FOOTER_DISPLAY_H   = 20;  // footer bar in display px ≈ 8 mm
const PAGE_TOP_MARGIN    = 32;  // display px — breathing room at top of pages 2+ (≈ 12 mm)
const PAGE_BOTTOM_MARGIN = 18;  // display px — breathing room above footer (≈ 7 mm)
const CONTENT_DISPLAY_H  = PAGE_DISPLAY_H - FOOTER_DISPLAY_H;              // 710 px — full content zone
const CONTENT_USABLE_H   = CONTENT_DISPLAY_H - PAGE_BOTTOM_MARGIN;         // 692 px — area content may fill
// Natural px of content per page — derived from the usable zone (not the full 710 px)
const CONTENT_NATURAL_H  = Math.round(CONTENT_USABLE_H / PREVIEW_SCALE);   // ≈ 1065 px

function PagedPreview({ paperData }) {
  const wrapperRef  = useRef(null);
  // pageBreaks[i] = natural-px Y where page i starts (same algorithm as PDF download)
  const [pageBreaks, setPageBreaks] = useState([0]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || wrapper.scrollHeight === 0) return;

    const naturalH = wrapper.scrollHeight; // unaffected by CSS transforms ✓
    const wRect    = wrapper.getBoundingClientRect();

    // Read .pdf-question positions in natural px.
    // wrapper has transform:scale(0.65), so visual offset = naturalY * PREVIEW_SCALE.
    // Dividing by PREVIEW_SCALE converts back to natural coordinates.
    const avoidRanges = Array.from(wrapper.querySelectorAll('.pdf-question')).map(el => {
      const r = el.getBoundingClientRect();
      return {
        top:    (r.top    - wRect.top) / PREVIEW_SCALE,
        bottom: (r.bottom - wRect.top) / PREVIEW_SCALE,
      };
    });

    // Same smart-break logic as handleDownload — move break to just before any cut question
    function findSmartBreak(idealPx, prevPx) {
      for (const r of avoidRanges) {
        if (r.top < idealPx && r.bottom > idealPx) {
          const candidate = r.top - 8; // 8 natural-px gap above question
          if (candidate > prevPx + 40) return candidate;
          break; // question taller than a page — accept the cut
        }
      }
      return idealPx;
    }

    const starts = [0];
    let next = CONTENT_NATURAL_H;
    while (next < naturalH) {
      const bp = findSmartBreak(next, starts[starts.length - 1]);
      starts.push(bp);
      next = bp + CONTENT_NATURAL_H;
    }

    // Only update state when breaks actually changed (prevents re-render loops)
    setPageBreaks(prev =>
      prev.length === starts.length && prev.every((v, i) => Math.abs(v - starts[i]) < 2)
        ? prev : starts
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pageBreaks.map((startNaturalPx, i) => {
        // Pages 2+ get a top breathing margin (like a page's top padding in a real PDF).
        const topMargin = i > 0 ? PAGE_TOP_MARGIN : 0;

        // Where does this page's content end (in display px, including the top margin offset)?
        // When a smart break moved earlier than CONTENT_NATURAL_H, content belonging to the
        // next page would bleed into this page — the bottom white mask clips it.
        const nextBreakNatural = i < pageBreaks.length - 1 ? pageBreaks[i + 1] : null;
        const pageContentEndPx = nextBreakNatural !== null
          ? Math.round((nextBreakNatural - startNaturalPx) * PREVIEW_SCALE) + topMargin
          : CONTENT_DISPLAY_H;

        return (
          <div key={i}>
            {/* A4 page card */}
            <div style={{
              width: PAGE_DISPLAY_W,
              height: PAGE_DISPLAY_H,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
              background: '#fff',
            }}>
              {/* Content — shifted so this page's start appears at display Y = topMargin */}
              <div
                ref={i === 0 ? wrapperRef : null}
                style={{
                  position: 'absolute',
                  top: -(startNaturalPx * PREVIEW_SCALE) + topMargin,
                  left: 0,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: 'top left',
                  width: A4_W_PX,
                }}
              >
                <PdfPreview paperData={paperData} />
              </div>

              {/* TOP margin mask (pages 2+): the content window extends slightly above
                  startNaturalPx into the previous page's territory. Cover it with white
                  so only the clean top-margin gap is visible. */}
              {topMargin > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: topMargin,
                  background: '#ffffff',
                  zIndex: 3,
                }} />
              )}

              {/* BOTTOM margin mask: always-visible breathing room above footer */}
              <div style={{
                position: 'absolute',
                top: CONTENT_USABLE_H,
                left: 0,
                right: 0,
                height: PAGE_BOTTOM_MARGIN,
                background: '#ffffff',
                zIndex: 3,
              }} />

              {/* BOTTOM smart-break mask: covers content that belongs on the next page when
                  a smart break moved the page end earlier than CONTENT_USABLE_H. */}
              {pageContentEndPx < CONTENT_USABLE_H && (
                <div style={{
                  position: 'absolute',
                  top: pageContentEndPx,
                  left: 0,
                  right: 0,
                  bottom: FOOTER_DISPLAY_H + PAGE_BOTTOM_MARGIN,
                  background: '#ffffff',
                  zIndex: 3,
                }} />
              )}

              {/* Professional footer — always pinned to bottom */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: FOOTER_DISPLAY_H,
                background: '#ffffff',
                borderTop: '1.5px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                zIndex: 5,
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 8, color: '#94a3b8' }}>
                  {paperData.metadata?.instituteName || ''}
                </span>
                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>
                  Page {i + 1} / {pageBreaks.length}
                </span>
                <span style={{ fontSize: 8, color: '#94a3b8' }}>
                  {paperData.metadata?.subject || ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Editor Component ────────────────────────────────────────────────────

export default function EditorPage() {
  const { paperId } = useParams();
  const location = useLocation();
  const { user, profile, refreshProfile, canDownload } = useAuth();

  const [paperData, setPaperData] = useState({
    metadata: {
      instituteName: profile?.institute_name || '',
      teacherName: profile?.full_name || '',
      subject: location.state?.subject || 'Mathematics',
      className: 'Class X',
      maxMarks: 80,
      timeDuration: '3 Hours',
    },
    questions: [emptyQuestion()],
    template: { accentColor: '#1a365d', fontFamily: 'Times New Roman' },
    title: 'Untitled Paper',
  });

  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLatexModal, setShowLatexModal] = useState(false);
  const [savedPaperId, setSavedPaperId] = useState(paperId || null);
  const [showMetadata, setShowMetadata] = useState(true);
  const [importBanner, setImportBanner] = useState('');

  // Load existing paper
  useEffect(() => {
    if (paperId) {
      getPaper(paperId).then(({ data }) => {
        if (data) {
          setPaperData({
            metadata: data.metadata || {},
            questions: data.questions || [emptyQuestion()],
            template: data.metadata?.template || { accentColor: '#1a365d', fontFamily: 'Times New Roman' },
            title: data.title,
          });
        }
      });
    }
  }, [paperId]);

  // Apply template preset when coming from TemplatesPage
  useEffect(() => {
    const templateId = location.state?.templateId;
    if (templateId && !paperId) {
      const preset = TEMPLATE_PRESETS[templateId];
      if (preset) {
        setPaperData({
          title: preset.title,
          metadata: {
            ...preset.metadata,
            instituteName: preset.metadata.instituteName || profile?.institute_name || '',
            teacherName: preset.metadata.teacherName || profile?.full_name || '',
          },
          questions: preset.questions,
          template: preset.template,
        });
        setImportBanner(`Template applied: ${preset.title}`);
        window.history.replaceState({}, '');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle questions imported from PDF Tools
  useEffect(() => {
    const iq = location.state?.importedQuestions;
    const it = location.state?.importedTitle;
    if (iq && iq.length > 0 && !paperId) {
      setPaperData(prev => ({
        ...prev,
        questions: iq,
        title: it || 'Imported Question Paper',
      }));
      setImportBanner(`${iq.length} question${iq.length > 1 ? 's' : ''} imported from PDF`);
      // Clear the location state so refresh doesn't re-import
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMetadata = (key, value) => {
    setPaperData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  };

  const updateQuestion = (id, field, value) => {
    setPaperData(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q),
    }));
  };

  const updateOption = (qId, optIdx, value) => {
    setPaperData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === qId ? { ...q, options: q.options.map((o, i) => i === optIdx ? value : o) } : q
      ),
    }));
  };

  const addQuestion = (type = 'MCQ') => {
    const q = emptyQuestion();
    q.type = type;
    setPaperData(prev => ({ ...prev, questions: [...prev.questions, q] }));
  };

  const removeQuestion = (id) => {
    setPaperData(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const handleImageUpload = (qId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    updateQuestion(qId, 'imageUrl', URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      id: savedPaperId || undefined,
      user_id: user.id,
      title: paperData.title,
      subject: paperData.metadata.subject,
      institute_name: paperData.metadata.instituteName,
      teacher_name: paperData.metadata.teacherName,
      class_name: paperData.metadata.className,
      max_marks: parseInt(paperData.metadata.maxMarks) || 80,
      time_duration: paperData.metadata.timeDuration,
      questions: paperData.questions,
      metadata: { ...paperData.metadata, template: paperData.template },
    };
    const { data } = await savePaper(payload);
    if (data) {
      setSavedPaperId(data.id);
      if (!paperId) await incrementPaperCount(user.id);
      refreshProfile();
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    if (!canDownload()) { setShowPaywall(true); return; }
    setDownloading(true);
    try {
      const element = document.getElementById('pdf-preview-root');
      if (!element) throw new Error('Preview not found');

      // Remove parent CSS scale so html2canvas captures at natural A4 size.
      // transform: scale() affects getBoundingClientRect() which html2canvas uses,
      // causing captures at 65% width that get squeezed into A4 (text collapse).
      const wrapper = element.parentElement;
      const savedTransform = wrapper.style.transform;
      wrapper.style.transform = 'none';
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Read question positions (element-relative px) while transform is removed
      const elRect = element.getBoundingClientRect();
      const questionEls = Array.from(element.querySelectorAll('.pdf-question'));
      const avoidRangesElPx = questionEls.map(el => {
        const r = el.getBoundingClientRect();
        return { top: r.top - elRect.top, bottom: r.bottom - elRect.top };
      });

      // AI Verification: Check for professional quality before generating PDF
      const verificationResult = await verifyPaperQuality(paperData);
      if (!verificationResult.isProfessional) {
        const proceed = window.confirm(
          `Quality Issues Found:\n\n${verificationResult.issues.join('\n')}\n\nContinue with download anyway?`
        );
        if (!proceed) {
          setDownloading(false);
          return;
        }
      }

      const SCALE = 3; // 288 DPI equivalent — sharp print-quality text
      let canvas;
      try {
        canvas = await html2canvas(element, {
          scale: SCALE,
          useCORS: true,
          backgroundColor: '#ffffff',
          // scrollHeight ensures full content is captured even though the element
          // sits inside a page-card container with overflow:hidden
          height: element.scrollHeight,
        });
      } finally {
        wrapper.style.transform = savedTransform;
      }

      // Convert question boundaries to canvas-pixel coordinates
      const avoidRanges = avoidRangesElPx.map(r => ({
        top:    Math.round(r.top    * SCALE),
        bottom: Math.round(r.bottom * SCALE),
      }));

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidthMM  = pdf.internal.pageSize.getWidth();   // 210 mm
      const pageHeightMM = pdf.internal.pageSize.getHeight();  // 297 mm
      const FOOTER_H_MM       = 8; // footer bar height — matches FOOTER_DISPLAY_H in preview
      const BOTTOM_MARGIN_MM  = 7; // breathing room above footer — matches PAGE_BOTTOM_MARGIN in preview
      // Content area per page = A4 height minus footer and bottom margin
      const pageHeightPx = Math.round(canvas.width * (pageHeightMM - FOOTER_H_MM - BOTTOM_MARGIN_MM) / pageWidthMM);

      // Find a break point that doesn't cut through any question.
      // If the ideal break lands inside a question, move it to just above that question.
      // Falls back to the ideal point if the question is taller than a full page.
      function findSmartBreak(idealPx, prevPx) {
        for (const r of avoidRanges) {
          if (r.top < idealPx && r.bottom > idealPx) {
            const candidate = r.top - SCALE * 8; // 8 CSS-px gap above question
            if (candidate > prevPx + SCALE * 40) return candidate; // must advance enough
            break; // question taller than page — accept the cut
          }
        }
        return idealPx;
      }

      // Build the list of canvas-pixel positions where each page starts
      const sliceStarts = [0];
      let nextIdeal = pageHeightPx;
      while (nextIdeal < canvas.height) {
        const breakPx = findSmartBreak(nextIdeal, sliceStarts[sliceStarts.length - 1]);
        sliceStarts.push(breakPx);
        nextIdeal = breakPx + pageHeightPx;
      }

      // Render each page as a canvas slice and add to the PDF
      sliceStarts.forEach((startPx, idx) => {
        const endPx    = idx + 1 < sliceStarts.length ? sliceStarts[idx + 1] : canvas.height;
        const sliceH   = endPx - startPx;
        const sliceHmm = sliceH * pageWidthMM / canvas.width; // proportional height in mm

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, sliceH);
        ctx.drawImage(canvas, 0, startPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (idx > 0) pdf.addPage();
        // Pages 2+ get a 5mm top margin (matches PAGE_TOP_MARGIN in the preview).
        // The vector footer drawn below covers any content that overflows into it.
        const imgTopMM = idx > 0 ? 12 : 0;
        
        // FILE SIZE OPTIMIZATION: Use JPEG for better compression while maintaining clarity
        // JPEG is better for text-heavy documents with fewer colors
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.7), 'JPEG', 0, imgTopMM, pageWidthMM, sliceHmm); // FILE SIZE: JPEG + 70% quality

        // ── Professional page footer (vector — crisp at any zoom) ──────────────
        const footerY = pageHeightMM - FOOTER_H_MM;
        // Separator line
        pdf.setDrawColor(203, 213, 225); // #cbd5e1
        pdf.setLineWidth(0.3);
        pdf.line(5, footerY, pageWidthMM - 5, footerY);
        // Footer text
        const textY = footerY + FOOTER_H_MM * 0.62;
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184); // #94a3b8 — muted
        pdf.text(paperData.metadata?.instituteName || '', 5, textY);
        pdf.setTextColor(100, 116, 139); // #64748b — slightly darker for page number
        pdf.text(`Page ${idx + 1} / ${sliceStarts.length}`, pageWidthMM / 2, textY, { align: 'center' });
        pdf.setTextColor(148, 163, 184);
        pdf.text(paperData.metadata?.subject || '', pageWidthMM - 5, textY, { align: 'right' });
      });

      pdf.save(`${paperData.title || 'question-paper'}-${Date.now()}.pdf`);

      if (!['monthly', 'yearly'].includes(profile?.subscription_status)) {
        await decrementCredit(user.id);
        refreshProfile();
      }
      await handleSave();
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('PDF generation failed. Please try again.');
    }
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Top toolbar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-2 shadow-sm">
        <input
          value={paperData.title}
          onChange={e => setPaperData(prev => ({ ...prev, title: e.target.value }))}
          className="font-semibold text-primary-900 text-sm border-none outline-none bg-transparent flex-1 max-w-xs"
          placeholder="Paper Title..."
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>

          {/* LaTeX download button */}
          <button
            onClick={() => setShowLatexModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            title="Download as LaTeX (.tex)"
          >
            <FileCode className="w-4 h-4" /> LaTeX
          </button>

          {/* PDF download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-4"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF {!['monthly','yearly'].includes(profile?.subscription_status) && `(${profile?.credits ?? 0} left)`}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-28">
        <div className="flex h-[calc(100vh-112px)]">

          {/* Left: Editor */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">

            {/* Import banner */}
            {importBanner && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <span>✅</span> {importBanner} — review and edit below
                </div>
                <button onClick={() => setImportBanner('')} className="text-green-400 hover:text-green-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="w-full flex items-center justify-between px-5 py-3 font-semibold text-primary-900 text-sm hover:bg-gray-50"
              >
                <span>📋 Paper Metadata</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
              </button>

              {showMetadata && (
                <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['instituteName', 'Institute Name'],
                    ['teacherName', 'Teacher Name'],
                    ['className', 'Class'],
                    ['maxMarks', 'Max Marks'],
                    ['timeDuration', 'Time Duration'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
                      <input
                        value={paperData.metadata[key] || ''}
                        onChange={e => updateMetadata(key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-900"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Subject</label>
                    <select
                      value={paperData.metadata.subject || 'Mathematics'}
                      onChange={e => updateMetadata('subject', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-900"
                    >
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Questions */}
            {paperData.questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                onChange={updateQuestion}
                onOptionChange={updateOption}
                onRemove={removeQuestion}
                onImageUpload={handleImageUpload}
              />
            ))}

            {/* Add Question Button */}
            <button
              onClick={() => addQuestion('MCQ')}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-gray-300 text-gray-600 text-sm rounded-xl hover:border-primary-900 hover:text-primary-900 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {/* Right: PDF Preview — paginated like a real PDF viewer */}
          {showPreview && (
            <div className="w-1/2 overflow-y-auto overflow-x-hidden bg-gray-300 p-4">
              <div className="sticky top-0 z-10 bg-gray-300 pb-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Live Preview</span>
                  <span className="text-xs text-gray-500">A4 Pages</span>
                </div>
              </div>
              <PagedPreview paperData={paperData} />
            </div>
          )}
        </div>
      </div>

      {showPaywall    && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {showLatexModal && <LatexFormatModal paperData={paperData} onClose={() => setShowLatexModal(false)} />}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

// ─── AI Quality Verification ──────────────────────────────────────────────────

async function verifyPaperQuality(paperData) {
  const issues = [];
  let isProfessional = true;

  // Check for duplicate questions
  const questions = paperData.questions || [];
  const questionTexts = questions.map(q => q.question.toLowerCase().trim());
  const duplicates = questionTexts.filter((text, index) => questionTexts.indexOf(text) !== index);
  if (duplicates.length > 0) {
    issues.push('⚠️ Duplicate questions found - ensure each question is unique');
    isProfessional = false;
  }

  // Check for empty questions
  const emptyQuestions = questions.filter(q => !q.question || q.question.trim().length === 0);
  if (emptyQuestions.length > 0) {
    issues.push(`❌ ${emptyQuestions.length} empty question(s) found`);
    isProfessional = false;
  }

  // Check for MCQ options issues
  const mcqQuestions = questions.filter(q => q.type === 'MCQ');
  mcqQuestions.forEach((q, index) => {
    const validOptions = q.options.filter(opt => opt && opt.trim());
    
    // Check for duplicate options
    const optionTexts = validOptions.map(opt => opt.toLowerCase().trim());
    const optionDuplicates = optionTexts.filter((text, idx) => optionTexts.indexOf(text) !== idx);
    if (optionDuplicates.length > 0) {
      issues.push(`❌ Question ${index + 1}: Duplicate options found`);
      isProfessional = false;
    }

    // Check for too few options
    if (validOptions.length < 2) {
      issues.push(`❌ Question ${index + 1}: MCQ needs at least 2 options`);
      isProfessional = false;
    }

    // Check for empty options
    const emptyOptions = q.options.filter(opt => !opt || !opt.trim());
    if (emptyOptions.length > 0) {
      issues.push(`❌ Question ${index + 1}: Empty options found`);
      isProfessional = false;
    }

    // Check answer key validity
    if (q.answer && !['A', 'B', 'C', 'D'].includes(q.answer.toUpperCase())) {
      issues.push(`❌ Question ${index + 1}: Invalid answer key (should be A, B, C, or D)`);
      isProfessional = false;
    }
  });

  // Check for spacing and formatting issues
  const totalMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks) || 1), 0);
  const expectedMarks = paperData.metadata?.maxMarks || 80;
  if (Math.abs(totalMarks - expectedMarks) > 5) {
    issues.push(`⚠️ Total marks (${totalMarks}) doesn't match expected (${expectedMarks})`);
    isProfessional = false;
  }

  // Check for proper question distribution
  const mcqCount = mcqQuestions.length;
const subjectiveCount = questions.filter(q => q.type === 'Subjective').length;

  if (mcqCount === 0 && subjectiveCount === 0) {
    issues.push('⚠️ Paper should have a mix of question types for better assessment');
  }

  // Check for proper metadata
  const requiredMetadata = ['instituteName', 'teacherName', 'subject', 'className'];
  const missingMetadata = requiredMetadata.filter(key => !paperData.metadata[key]);
  if (missingMetadata.length > 0) {
    issues.push(`⚠️ Missing metadata: ${missingMetadata.join(', ')}`);
  }

  return { isProfessional, issues };
}

function QuestionCard({ question, index, onChange, onOptionChange, onRemove, onImageUpload }) {
  const [expanded, setExpanded] = useState(true);
  const fileRef = useRef(null);

  const typeColors = {
    'MCQ': 'bg-blue-100 text-blue-700',
    'True/False': 'bg-green-100 text-green-700',
    'Subjective': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 mb-3 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-7 h-7 rounded-full bg-primary-900 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColors[question.type]}`}>
          {question.type}
        </span>
        <span className="text-sm text-gray-600 truncate flex-1">
          {question.question
            ? question.question.substring(0, 60) + (question.question.length > 60 ? '...' : '')
            : 'Empty question...'}
        </span>
        <span className="text-xs text-gray-400">{question.marks}m</span>
        <button
          onClick={e => { e.stopPropagation(); onRemove(question.id); }}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {/* Type selector + marks */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="text-xs text-gray-500 font-medium">Type:</label>
            {['MCQ', 'True/False', 'Subjective'].map(t => (
              <button
                key={t}
                onClick={() => onChange(question.id, 'type', t)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  question.type === t ? 'bg-primary-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-gray-500">Marks:</label>
              <input
                type="number"
                value={question.marks}
                onChange={e => onChange(question.id, 'marks', parseInt(e.target.value) || 1)}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                min="1"
              />
            </div>
          </div>

          {/* Question input */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium block mb-1">Question (supports $LaTeX$)</label>
            <LatexInput
              value={question.question}
              onChange={val => onChange(question.id, 'question', val)}
              multiline
              placeholder="Enter question... Use $\frac{1}{2}$ for LaTeX math"
            />
          </div>

          {/* MCQ Options */}
          {question.type === 'MCQ' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={e => onOptionChange(question.id, i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-900 font-mono"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Correct Answer (A/B/C/D)</label>
                <input
                  value={question.answer}
                  onChange={e => onChange(question.id, 'answer', e.target.value.toUpperCase())}
                  placeholder="A"
                  className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center"
                  maxLength={1}
                />
              </div>
            </div>
          )}

          {/* Image upload */}
          <div className="flex items-center gap-2">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => onImageUpload(question.id, e)} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 hover:border-primary-900 hover:text-primary-900 transition-all"
            >
              <Image className="w-3 h-3" /> {question.imageUrl ? 'Change Image' : 'Add Diagram/Image'}
            </button>
            {question.imageUrl && (
              <img src={question.imageUrl} alt="diagram" className="h-12 rounded-lg border border-gray-200" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
