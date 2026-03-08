import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signUpWithPassword = async (email, password, fullName) => {
  try {
    const { data } = await api.post('/auth/register', { email, password, fullName });
    localStorage.setItem('ss_token', data.token);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const signInWithPassword = async (email, password) => {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ss_token', data.token);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const signOut = () => {
  localStorage.removeItem('ss_token');
};

export const forgotPassword = async (email) => {
  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const resetPassword = async (token, password) => {
  try {
    const { data } = await api.post('/auth/reset-password', { token, password });
    localStorage.setItem('ss_token', data.token);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const googleSignIn = async (credential) => {
  try {
    const { data } = await api.post('/auth/google', { credential });
    localStorage.setItem('ss_token', data.token);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const verifyEmail = async (token) => {
  try {
    const { data } = await api.get(`/auth/verify-email?token=${token}`);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const resendVerification = async () => {
  try {
    const { data } = await api.post('/auth/resend-verification');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const getProfile = async () => {
  try {
    const { data } = await api.get('/auth/profile');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const decrementCredit = async () => {
  try {
    const { data } = await api.patch('/auth/decrement-credit');
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

// incrementPaperCount is handled automatically by the backend on paper POST
export const incrementPaperCount = async () => ({ data: null, error: null });

// ─── Papers ───────────────────────────────────────────────────────────────────

export const getPapers = async () => {
  try {
    const { data } = await api.get('/papers');
    // Normalize _id → id to match existing frontend code
    return { data: data.map(normalizeId), error: null };
  } catch (err) {
    return { data: [], error: { message: err.response?.data?.message || err.message } };
  }
};

export const getPaper = async (paperId) => {
  try {
    const { data } = await api.get(`/papers/${paperId}`);
    return { data: normalizeId(data), error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const savePaper = async (paper) => {
  try {
    const { id, _id, user_id, userId, ...rest } = paper;
    const paperId = id || _id;
    let data;
    if (paperId) {
      const res = await api.put(`/papers/${paperId}`, rest);
      data = normalizeId(res.data);
    } else {
      const res = await api.post('/papers', rest);
      data = normalizeId(res.data);
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const deletePaper = async (paperId) => {
  try {
    await api.delete(`/papers/${paperId}`);
    return { error: null };
  } catch (err) {
    return { error: { message: err.response?.data?.message || err.message } };
  }
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const createTransaction = async (txn) => {
  try {
    const { data } = await api.post('/transactions', txn);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// MongoDB uses _id; the frontend expects id
function normalizeId(obj) {
  if (!obj) return obj;
  return { ...obj, id: obj._id || obj.id };
}

// Convert PDF or image to LaTeX via Gemini
export const convertToLatexWithAI = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/to-latex', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

// PDF to PPT API
export const extractPptSlides = async (file, description = '') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (description?.trim()) formData.append('description', description.trim());
    const { data } = await api.post('/pdf-to-ppt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

export const downloadPptxFromSlides = async (title, subject, slides) => {
  try {
    const response = await api.post('/pdf-to-ppt/download', { title, subject, slides }, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }));
    const a = document.createElement('a');
    const safeName = (title || 'presentation').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.href = url; a.download = `${safeName}.pptx`; a.click();
    URL.revokeObjectURL(url);
    return { error: null };
  } catch (err) {
    return { error: { message: err.response?.data?.message || err.message } };
  }
};

// PDF Extraction API
export const extractPdfWithGemini = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await api.post('/pdf-extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.response?.data?.message || err.message } };
  }
};

// Kept for backward compat — not used
export const signInWithGoogle = async () => ({
  data: null,
  error: { message: 'Google sign-in is not configured. Please use email & password.' },
});
