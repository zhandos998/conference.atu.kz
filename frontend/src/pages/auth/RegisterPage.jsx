import { useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';

export default function RegisterPage({ onSwitch }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await api.post('/auth/register', form);
      setMessage('Регистрация успешна. Подтвердите email и выполните вход.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Ошибка регистрации');
    }
  };

  return (
    <AppLayout title="Регистрация" subtitle="Создайте аккаунт участника конференции">
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label>Имя</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Пароль</label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="field">
          <label>Подтверждение пароля</label>
          <input required type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
        </div>

        {message && <p>{message}</p>}

        <div className="inline-actions">
          <button className="btn-primary" type="submit">Создать аккаунт</button>
          <button className="btn-secondary" type="button" onClick={onSwitch}>Назад</button>
        </div>
      </form>
    </AppLayout>
  );
}
