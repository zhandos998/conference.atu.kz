import { useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || 'Ссылка для сброса пароля отправлена.');
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось отправить ссылку для сброса.');
    }
  };

  return (
    <AppLayout title="Восстановление пароля" subtitle="Введите email, указанный при регистрации">
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {message && <p>{message}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="inline-actions">
          <button className="btn-primary" type="submit">Отправить ссылку</button>
          <button className="btn-secondary" type="button" onClick={onBackToLogin}>Назад ко входу</button>
        </div>
      </form>
    </AppLayout>
  );
}
