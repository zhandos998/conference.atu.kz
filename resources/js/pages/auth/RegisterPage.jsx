import { useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { useI18n } from '../../i18n';

export default function RegisterPage({ onSwitch }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await api.post('/auth/register', form);
      setMessage(t('auth.register.success'));
    } catch (err) {
      setMessage(err.response?.data?.message || t('auth.register.error'));
    }
  };

  return (
    <AppLayout variant="auth" title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label>{t('auth.register.name')}</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('common.email')}</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('common.password')}</label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('auth.register.confirmPassword')}</label>
          <input required type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
        </div>

        {message && <p>{message}</p>}

        <div className="inline-actions">
          <button className="btn-primary" type="submit">{t('auth.register.submit')}</button>
          <button className="btn-secondary" type="button" onClick={onSwitch}>{t('auth.register.back')}</button>
        </div>
      </form>
    </AppLayout>
  );
}
