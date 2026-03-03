import React, { useRef } from 'react';
import katex from 'katex';

function renderLatex(text) {
  if (!text) return '';
  let result = text;
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    try { return `<span style="display:block;text-align:center;margin:8px 0">${katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false })}</span>`; }
    catch { return _; }
  });
  result = result.replace(/\$([^$\n]+?)\$/g, (_, latex) => {
    try { return katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false }); }
    catch { return _; }
  });
  return result;
}

export default function PdfPreview({ paperData }) {
  const { metadata = {}, questions = [], template = {} } = paperData || {};
  const previewRef = useRef(null);

  const accentColor = template.accentColor || '#1a365d';
  const fontFamily = template.fontFamily || 'Times New Roman';

  return (
    <div ref={previewRef} id="pdf-preview-root" className="pdf-preview" style={{ fontFamily, color: '#000' }}>
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accentColor}`, marginBottom: 16, paddingBottom: 12, textAlign: 'center' }}>
        {metadata.instituteName && (
          <div style={{ fontSize: 18, fontWeight: 'bold', color: accentColor, marginBottom: 4 }}>
            {metadata.instituteName}
          </div>
        )}
        {metadata.subject && (
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{metadata.subject} Question Paper</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 8, color: '#333' }}>
          <span>{metadata.className && `Class: ${metadata.className}`}</span>
          <span>{metadata.maxMarks && `Max Marks: ${metadata.maxMarks}`}</span>
          <span>{metadata.timeDuration && `Time: ${metadata.timeDuration}`}</span>
        </div>
        {metadata.teacherName && (
          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Teacher: {metadata.teacherName}</div>
        )}
      </div>

      {/* General Instructions */}
      <div style={{ fontSize: 10, color: '#444', marginBottom: 16, borderLeft: `3px solid ${accentColor}`, paddingLeft: 10, backgroundColor: '#f9f9f9', padding: '8px 12px', borderRadius: 4 }}>
        <strong>General Instructions:</strong> All questions are compulsory. Read each question carefully before answering.
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 13 }}>
          Add questions on the left to see preview here...
        </div>
      ) : (
        <div>
          {/* Group by section */}
          {['MCQ', 'True/False', 'Subjective'].map(type => {
            const sectionQs = questions.filter(q => q.type === type);
            if (sectionQs.length === 0) return null;

            const sectionMarks = {
              'MCQ': '1 mark each',
              'True/False': '1 mark each',
              'Subjective': 'as indicated',
            };

            return (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ backgroundColor: accentColor, color: '#fff', padding: '4px 12px', fontWeight: 'bold', fontSize: 11, borderRadius: 4, marginBottom: 10 }}>
                  Section: {type} ({sectionMarks[type]})
                </div>

                {sectionQs.map((q, idx) => (
                  <div key={q.id} className="pdf-question" style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
                    <div style={{ minWidth: 24, fontWeight: 'bold', fontSize: 12 }}>
                      {questions.indexOf(q) + 1}.
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 6 }}
                        dangerouslySetInnerHTML={{ __html: renderLatex(q.question) }}
                      />

                      {/* MCQ Options */}
                      {q.type === 'MCQ' && q.options && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 11, color: '#333', marginTop: 6 }}>
                          {q.options.map((opt, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ minWidth: 16, fontWeight: 600, alignSelf: 'flex-start', paddingTop: '0.15em' }}>{String.fromCharCode(65 + i)})</span>
                              <span style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 'normal' }} dangerouslySetInnerHTML={{ __html: renderLatex(opt) }} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* True/False */}
                      {q.type === 'True/False' && (
                        <div style={{ display: 'flex', gap: 20, fontSize: 11, marginTop: 4 }}>
                          <span style={{ border: '1px solid #999', padding: '1px 16px', borderRadius: 3 }}>True</span>
                          <span style={{ border: '1px solid #999', padding: '1px 16px', borderRadius: 3 }}>False</span>
                        </div>
                      )}

                      {/* Subjective answer lines */}
                      {q.type === 'Subjective' && (
                        <div style={{ borderBottom: '1px solid #ddd', marginTop: 8, height: Math.max(40, (q.marks || 2) * 12) }}>
                          {[...Array(Math.max(3, Math.floor((q.marks || 2) * 1.5)))].map((_, li) => (
                            <div key={li} style={{ borderBottom: '1px dashed #e5e5e5', height: 24 }}></div>
                          ))}
                        </div>
                      )}

                      {/* Question image */}
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt={`Q${questions.indexOf(q) + 1} diagram`}
                          style={{ maxWidth: 280, maxHeight: 180, marginTop: 8, border: '1px solid #ddd', borderRadius: 4 }} />
                      )}

                      {/* Marks */}
                      <div style={{ textAlign: 'right', fontSize: 10, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
                        [{q.marks || 1} mark{(q.marks || 1) !== 1 ? 's' : ''}]
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `2px solid ${accentColor}`, marginTop: 24, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666' }}>
        <span>{metadata.instituteName || 'ShikshaSetu'}</span>
        <span>*** End of Paper ***</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
