import { useMemo, useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';

export default function ResetPasswordPage({ token, email, onBackToLogin }) {
  const [form, setForm] = useState({
    email: email || '',
    password: '',
    password_confirmation: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const missingToken = useMemo(() => !token, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      setMessage(data.message || 'Пароль успешно изменен. Теперь войдите в систему.');
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось изменить пароль.');
    }
  };

  return (
    <AppLayout title="Сброс пароля" subtitle="Укажите новый пароль для входа в систему">
      {missingToken ? (
        <>
          <p className="error-text">Токен сброса отсутствует или устарел. Запросите ссылку повторно.</p>
          <button className="btn-secondary" type="button" onClick={onBackToLogin}>Ко входу</button>
        </>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="field">
            <label>Новый пароль</label>
            <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <div className="field">
            <label>Подтверждение пароля</label>
            <input required minLength={8} type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
          </div>

          {message && <p>{message}</p>}
          {error && <p className="error-text">{error}</p>}

          <div className="inline-actions">
            <button className="btn-primary" type="submit">Сохранить пароль</button>
            <button className="btn-secondary" type="button" onClick={onBackToLogin}>Ко входу</button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
