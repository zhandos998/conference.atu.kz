import { useEffect, useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';

const initialForm = {
  full_name: '',
  organization_position: '',
  academic_degree: '',
  phone: '',
  email: '',
  supervisor_full_name: '',
  supervisor_organization_position: '',
  supervisor_academic_degree: '',
  report_title: '',
  direction: '',
  participation_form: '',
  hotel_booking_needed: false,
  file: null,
};

const statusClass = {
  pending: 'status status-pending',
  accepted: 'status status-accepted',
  revision: 'status status-revision',
  rejected: 'status status-rejected',
};

const statusLabel = {
  pending: 'На рассмотрении',
  accepted: 'Принято',
  revision: 'На доработку',
  rejected: 'Отклонено',
};

const toForm = (application) => ({
  full_name: application?.full_name || '',
  organization_position: application?.organization_position || '',
  academic_degree: application?.academic_degree || '',
  phone: application?.phone || '',
  email: application?.email || '',
  supervisor_full_name: application?.supervisor_full_name || '',
  supervisor_organization_position: application?.supervisor_organization_position || '',
  supervisor_academic_degree: application?.supervisor_academic_degree || '',
  report_title: application?.report_title || '',
  direction: application?.direction || '',
  participation_form: application?.participation_form || '',
  hotel_booking_needed: Boolean(application?.hotel_booking_needed),
  file: null,
});

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const toReportFileUrl = (path) => `${apiOrigin}/storage/${path}`;

export default function UserDashboard({ onLogout }) {
  const [view, setView] = useState('list');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadApplications = async () => {
    const { data } = await api.get('/applications');
    setApplications(data);
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const openApplication = async (applicationId) => {
    setMessage('');
    setError('');

    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setSelectedApplication(data);
      setView('detail');
    } catch (err) {
      setError(err.response?.data?.message || 'Не удалось открыть заявку.');
    }
  };

  const goToList = async () => {
    setMessage('');
    setError('');
    setPaymentReceipt(null);
    await loadApplications();
    setView('list');
  };

  const goToCreate = () => {
    setMessage('');
    setError('');
    setForm(initialForm);
    setView('create');
  };

  const goToEdit = () => {
    if (!selectedApplication) {
      return;
    }

    if (selectedApplication.status !== 'revision') {
      setError('Редактирование доступно только для заявок со статусом "На доработку".');
      return;
    }

    setMessage('');
    setError('');
    setForm(toForm(selectedApplication));
    setView('edit');
  };

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (key === 'file' && !value) {
        return;
      }

      payload.append(key, key === 'hotel_booking_needed' ? Number(value) : value);
    });

    return payload;
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.post('/applications', buildPayload());
      setMessage('Заявка успешно отправлена.');
      await goToList();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при отправке заявки.');
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedApplication) {
      return;
    }

    try {
      const payload = buildPayload();
      payload.append('_method', 'PATCH');

      await api.post(`/applications/${selectedApplication.id}`, payload);

      const { data } = await api.get(`/applications/${selectedApplication.id}`);
      setSelectedApplication(data);
      setMessage('Исправленная заявка отправлена на повторное рассмотрение.');
      setView('detail');
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при обновлении заявки.');
    }
  };

  const submitPaymentReceipt = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedApplication || !paymentReceipt) {
      setError('Выберите файл чека.');
      return;
    }

    const payload = new FormData();
    payload.append('payment_receipt', paymentReceipt);

    try {
      await api.post(`/applications/${selectedApplication.id}/payment-receipt`, payload);
      const { data } = await api.get(`/applications/${selectedApplication.id}`);
      setSelectedApplication(data);
      setPaymentReceipt(null);
      setMessage('Чек успешно загружен.');
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка загрузки чека.');
    }
  };

  const renderApplicationForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit}>
      <div className="grid">
        <div className="field">
          <label>Ф.И.О.</label>
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Место учебы/работы и должность</label>
          <input
            required
            value={form.organization_position}
            onChange={(e) => setForm({ ...form, organization_position: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Ученая степень</label>
          <input required value={form.academic_degree} onChange={(e) => setForm({ ...form, academic_degree: e.target.value })} />
        </div>
        <div className="field">
          <label>Телефон</label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Ф.И.О. научного руководителя</label>
          <input
            required
            value={form.supervisor_full_name}
            onChange={(e) => setForm({ ...form, supervisor_full_name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Должность научного руководителя</label>
          <input
            required
            value={form.supervisor_organization_position}
            onChange={(e) => setForm({ ...form, supervisor_organization_position: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Степень научного руководителя</label>
          <input
            required
            value={form.supervisor_academic_degree}
            onChange={(e) => setForm({ ...form, supervisor_academic_degree: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Название доклада</label>
          <input required value={form.report_title} onChange={(e) => setForm({ ...form, report_title: e.target.value })} />
        </div>
        <div className="field">
          <label>Направление</label>
          <input required value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
        </div>
        <div className="field">
          <label>Форма участия</label>
          <input required value={form.participation_form} onChange={(e) => setForm({ ...form, participation_form: e.target.value })} />
        </div>
        <div className="field">
          <label>Бронирование гостиницы</label>
          <select
            value={String(form.hotel_booking_needed)}
            onChange={(e) => setForm({ ...form, hotel_booking_needed: e.target.value === 'true' })}
          >
            <option value="false">Нет</option>
            <option value="true">Да</option>
          </select>
        </div>
        <div className="field">
          <label>Файл доклада (PDF/DOC/DOCX)</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
        </div>
      </div>

      <div className="inline-actions">
        <button className="btn-primary" type="submit">{submitLabel}</button>
        <button className="btn-secondary" type="button" onClick={goToList}>Назад к списку</button>
      </div>
    </form>
  );

  const renderList = () => (
    <>
      <div className="inline-actions">
        <button className="btn-primary" type="button" onClick={goToCreate}>Добавить заявку</button>
      </div>

      {applications.length === 0 ? (
        <p>Пока нет заявок.</p>
      ) : (
        <div className="list">
          {applications.map((app) => (
            <div key={app.id} className="app-item">
              <p><strong>{app.report_title}</strong></p>
              <p><strong>Дата:</strong> {new Date(app.created_at).toLocaleString('ru-RU')}</p>
              <p>
                <strong>Статус:</strong>{' '}
                <span className={statusClass[app.status] || statusClass.pending}>
                  {statusLabel[app.status] || app.status}
                </span>
              </p>
              <div className="inline-actions">
                <button className="btn-secondary" type="button" onClick={() => openApplication(app.id)}>
                  Открыть заявку
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderDetail = () => {
    if (!selectedApplication) {
      return <p>Заявка не выбрана.</p>;
    }

    const reportFileUrl = selectedApplication.file_path ? toReportFileUrl(selectedApplication.file_path) : '';

    return (
      <>
        <div className="inline-actions">
          <button className="btn-secondary" type="button" onClick={goToList}>К списку заявок</button>
          <button
            className="btn-primary"
            type="button"
            onClick={goToEdit}
            disabled={selectedApplication.status !== 'revision'}
            title={selectedApplication.status !== 'revision' ? 'Редактирование доступно только для заявок на доработке' : ''}
          >
            Изменить заявку
          </button>
        </div>

        <div className="app-item" style={{ marginTop: 12 }}>
          <p><strong>Ф.И.О.:</strong> {selectedApplication.full_name}</p>
          <p><strong>Место учебы/работы и должность:</strong> {selectedApplication.organization_position}</p>
          <p><strong>Ученая степень:</strong> {selectedApplication.academic_degree}</p>
          <p><strong>Телефон:</strong> {selectedApplication.phone}</p>
          <p><strong>Email:</strong> {selectedApplication.email}</p>
          <p><strong>Ф.И.О. научного руководителя:</strong> {selectedApplication.supervisor_full_name}</p>
          <p><strong>Должность научного руководителя:</strong> {selectedApplication.supervisor_organization_position}</p>
          <p><strong>Степень научного руководителя:</strong> {selectedApplication.supervisor_academic_degree}</p>
          <p><strong>Название доклада:</strong> {selectedApplication.report_title}</p>
          <p><strong>Направление:</strong> {selectedApplication.direction}</p>
          <p><strong>Форма участия:</strong> {selectedApplication.participation_form}</p>
          <p><strong>Бронирование гостиницы:</strong> {selectedApplication.hotel_booking_needed ? 'Да' : 'Нет'}</p>
          <p>
            <strong>Файл доклада:</strong>{' '}
            {selectedApplication.file_path ? (
              <a href={reportFileUrl} target="_blank" rel="noreferrer">Открыть файл</a>
            ) : (
              'Файл не загружен'
            )}
          </p>
          <p>
            <strong>Статус:</strong>{' '}
            <span className={statusClass[selectedApplication.status] || statusClass.pending}>
              {statusLabel[selectedApplication.status] || selectedApplication.status}
            </span>
          </p>
          <p><strong>Комментарий модератора:</strong> {selectedApplication.moderator_comment || '-'}</p>
        </div>

        {selectedApplication.status === 'accepted' && (
          <form onSubmit={submitPaymentReceipt} style={{ marginTop: 12 }}>
            <div className="field" style={{ maxWidth: 420 }}>
              <label>Загрузка чека об оплате</label>
              <input type="file" onChange={(e) => setPaymentReceipt(e.target.files?.[0] || null)} />
            </div>
            <div className="inline-actions">
              <button className="btn-primary" type="submit">Загрузить чек</button>
            </div>
          </form>
        )}
      </>
    );
  };

  return (
    <AppLayout
      title="Кабинет участника"
      subtitle="Личный раздел участника конференции"
      actions={
        <button className="btn-danger" onClick={onLogout}>Выйти</button>
      }
    >
      <p>
        <strong>Контакты оргкомитета:</strong> +7 (777) 000-00-00, conference@atu.edu.kz
      </p>

      {message && <p>{message}</p>}
      {error && <p className="error-text">{error}</p>}

      {view === 'list' && renderList()}
      {view === 'create' && renderApplicationForm(submitCreate, 'Отправить заявку')}
      {view === 'detail' && renderDetail()}
      {view === 'edit' && renderApplicationForm(submitEdit, 'Сохранить изменения')}
    </AppLayout>
  );
}
