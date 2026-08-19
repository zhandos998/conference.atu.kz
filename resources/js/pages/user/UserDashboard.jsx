import { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';

const initialForm = {
  full_name: '',
  organization_position: '',
  academic_degree: '',
  phone: '',
  email: '',
  supervisor_full_name: '',
  supervisor_organization_position: '',
  supervisor_academic_degree: '',
  department: '',
  report_title: '',
  direction: '',
  participation_form: '',
  hotel_booking_needed: false,
  file: null,
};

const directionOptions = [
  'Технология пищевых и перерабатывающих производств',
  'Легкая и текстильная промышленность',
  'Механизация, автоматизация и информатизация технологических процессов',
  'Общеэкономические проблемы, индустрия гостеприимства',
  'Естественные науки',
  'Социально-гуманитарные науки',
];

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
  department: application?.department || '',
  report_title: application?.report_title || '',
  direction: application?.direction || '',
  participation_form: application?.participation_form || '',
  hotel_booking_needed: Boolean(application?.hotel_booking_needed),
  file: null,
});

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const toReportFileUrl = (path) => `${apiOrigin}/storage/${path}`;
const getUserApplicationIdFromLocation = () => {
  const path = window.location.pathname.replace(/\/+$/, '');
  const match = path.match(/^\/applications\/(\d+)$/);

  return match ? Number(match[1]) : null;
};
const viewTitle = {
  list: 'Мои заявки',
  create: 'Новая заявка',
  detail: 'Просмотр заявки',
  edit: 'Редактирование заявки',
};

export default function UserDashboard({ user, onLogout }) {
  const [view, setView] = useState('list');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', message: '' });

  const openNotice = (title, msg) => setNoticeModal({ open: true, title, message: msg });
  const closeNotice = () => setNoticeModal({ open: false, title: '', message: '' });
  const applicationStats = applications.reduce((acc, application) => {
    acc.total += 1;
    acc[application.status] = (acc[application.status] || 0) + 1;

    return acc;
  }, { total: 0, pending: 0, accepted: 0, revision: 0, rejected: 0 });
  const userName = user?.name || user?.email || 'Участник';

  const loadApplications = async () => {
    const { data } = await api.get('/applications');
    setApplications(data);
  };

  const loadSubmissionSettings = async () => {
    const { data } = await api.get('/application-submission-settings');
    setSubmissionEnabled(Boolean(data?.enabled));
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        loadApplications(),
        loadSubmissionSettings(),
      ]);

      const applicationId = getUserApplicationIdFromLocation();
      if (applicationId) {
        await openApplication(applicationId);
      }
    };

    bootstrap();
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

  const goToList = async ({ successMessage = '' } = {}) => {
    setMessage('');
    setError('');
    setPaymentReceipt(null);
    await Promise.all([
      loadApplications(),
      loadSubmissionSettings(),
    ]);
    setSelectedApplication(null);
    setView('list');

    if (getUserApplicationIdFromLocation()) {
      window.history.replaceState({}, '', '/');
    }

    if (successMessage) {
      setMessage(successMessage);
      openNotice('Заявка отправлена', successMessage);
    }
  };

  const goToCreate = () => {
    if (!submissionEnabled) {
      openNotice('Прием заявок отключен', 'Менеджер временно отключил отправку заявок.');
      return;
    }

    setMessage('');
    setError('');
    setForm(initialForm);
    setView('create');
  };

  const goToEdit = () => {
    if (!selectedApplication) {
      return;
    }

    if (!submissionEnabled) {
      openNotice('Повторная отправка отключена', 'Менеджер временно отключил отправку заявок.');
      return;
    }

    if (selectedApplication.status !== 'revision') {
      openNotice('Редактирование недоступно', 'Изменить заявку можно только при статусе "На доработку".');
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

    if (!submissionEnabled) {
      setError('Менеджер временно отключил отправку заявок.');
      return;
    }

    try {
      await api.post('/applications', buildPayload());
      await goToList({
        successMessage: 'Ваша заявка успешно отправлена. Статус можно отслеживать в списке заявок.',
      });
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

    if (!submissionEnabled) {
      setError('Менеджер временно отключил отправку заявок.');
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
      openNotice('Чек не выбран', 'Перед отправкой нужно выбрать файл чека.');
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
    <form onSubmit={onSubmit} className="application-form">
      {!submissionEnabled && <p className="error-text">Прием заявок временно отключен менеджером.</p>}

      <div className="form-section-title">{view === 'edit' ? 'Обновите данные доклада' : 'Заполните данные участника и доклада'}</div>
      <div className="grid">
        <div className="field">
          <label>Ф.И.О.</label>
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Место учебы/работы и должность</label>
          <input required value={form.organization_position} onChange={(e) => setForm({ ...form, organization_position: e.target.value })} />
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
          <input required value={form.supervisor_full_name} onChange={(e) => setForm({ ...form, supervisor_full_name: e.target.value })} />
        </div>
        <div className="field">
          <label>Должность научного руководителя</label>
          <input required value={form.supervisor_organization_position} onChange={(e) => setForm({ ...form, supervisor_organization_position: e.target.value })} />
        </div>
        <div className="field">
          <label>Степень научного руководителя</label>
          <input required value={form.supervisor_academic_degree} onChange={(e) => setForm({ ...form, supervisor_academic_degree: e.target.value })} />
        </div>
        <div className="field">
          <label>Кафедра</label>
          <input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <div className="field">
          <label>Название доклада</label>
          <input required value={form.report_title} onChange={(e) => setForm({ ...form, report_title: e.target.value })} />
        </div>
        <div className="field">
          <label>Направление</label>
          <select required value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="" disabled>Выберите направление</option>
            {directionOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Форма участия</label>
          <input required value={form.participation_form} onChange={(e) => setForm({ ...form, participation_form: e.target.value })} />
        </div>
        <div className="field">
          <label>Бронирование гостиницы</label>
          <select value={String(form.hotel_booking_needed)} onChange={(e) => setForm({ ...form, hotel_booking_needed: e.target.value === 'true' })}>
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
        <button className="btn-primary" type="submit" disabled={!submissionEnabled}>{submitLabel}</button>
        <button className="btn-secondary" type="button" onClick={goToList}>Назад к списку</button>
      </div>
    </form>
  );

  const renderList = () => (
    <section className="user-panel">
      <div className="user-panel-head">
        <div>
          <h2>{viewTitle.list}</h2>
          <p>Всего заявок: {applicationStats.total}</p>
        </div>
        <button className="btn-primary" type="button" onClick={goToCreate} disabled={!submissionEnabled}>Добавить заявку</button>
      </div>

      {!submissionEnabled && <p className="error-text">Прием заявок сейчас отключен менеджером.</p>}

      {applications.length === 0 ? (
        <div className="empty-state">
          <h3>Пока нет заявок</h3>
          <p>После отправки доклада здесь появятся статус, дата создания и ссылка на карточку заявки.</p>
        </div>
      ) : (
        <div className="user-application-list">
          {applications.map((app) => (
            <div key={app.id} className="user-application-row">
              <div>
                <div className="user-application-row-head">
                  <h3 className="app-title">{app.report_title}</h3>
                  <span className={statusClass[app.status] || statusClass.pending}>{statusLabel[app.status] || app.status}</span>
                </div>
                <p className="app-meta">{new Date(app.created_at).toLocaleString('ru-RU')}</p>
              </div>
              <div className="user-row-actions">
                <a className="btn-secondary" href={`/applications/${app.id}`} target="_blank" rel="noreferrer">Открыть заявку</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderFormPanel = (onSubmit, submitLabel) => (
    <section className="user-panel user-form-panel">
      <div className="user-panel-head">
        <div>
          <h2>{viewTitle[view]}</h2>
          <p>{view === 'edit' ? 'Исправьте заявку и отправьте ее повторно.' : 'Заполните данные участника и доклада.'}</p>
        </div>
      </div>
      {renderApplicationForm(onSubmit, submitLabel)}
    </section>
  );

  const renderDetail = () => {
    if (!selectedApplication) {
      return (
        <section className="user-panel">
          <div className="empty-state">
            <h3>Заявка не выбрана</h3>
          </div>
        </section>
      );
    }

    const reportFileUrl = selectedApplication.file_path ? toReportFileUrl(selectedApplication.file_path) : '';

    return (
      <section className="user-panel user-detail-section">
        <div className="user-panel-head">
          <div>
            <h2>{viewTitle.detail}</h2>
            <p>Заявка #{selectedApplication.id}</p>
          </div>
          <span className={statusClass[selectedApplication.status] || statusClass.pending}>{statusLabel[selectedApplication.status] || selectedApplication.status}</span>
        </div>

        <div className="inline-actions user-detail-actions">
          <button className="btn-secondary" type="button" onClick={goToList}>К списку заявок</button>
          <button className="btn-primary" type="button" onClick={goToEdit} disabled={!submissionEnabled}>Изменить заявку</button>
        </div>

        <div className="detail-panel">
          <div className="detail-head">
            <div>
              <p className="section-kicker">Доклад</p>
              <h2>{selectedApplication.report_title}</h2>
            </div>
          </div>

          <div className="detail-grid">
            <div><span>Ф.И.О.</span><strong>{selectedApplication.full_name}</strong></div>
            <div><span>Место учебы/работы и должность</span><strong>{selectedApplication.organization_position}</strong></div>
            <div><span>Ученая степень</span><strong>{selectedApplication.academic_degree}</strong></div>
            <div><span>Телефон</span><strong>{selectedApplication.phone}</strong></div>
            <div><span>Email</span><strong>{selectedApplication.email}</strong></div>
            <div><span>Научный руководитель</span><strong>{selectedApplication.supervisor_full_name}</strong></div>
            <div><span>Должность руководителя</span><strong>{selectedApplication.supervisor_organization_position}</strong></div>
            <div><span>Степень руководителя</span><strong>{selectedApplication.supervisor_academic_degree}</strong></div>
            <div><span>Кафедра</span><strong>{selectedApplication.department}</strong></div>
            <div><span>Направление</span><strong>{selectedApplication.direction}</strong></div>
            <div><span>Форма участия</span><strong>{selectedApplication.participation_form}</strong></div>
            <div><span>Бронирование гостиницы</span><strong>{selectedApplication.hotel_booking_needed ? 'Да' : 'Нет'}</strong></div>
            <div><span>Дата создания</span><strong>{selectedApplication.created_at ? new Date(selectedApplication.created_at).toLocaleString('ru-RU') : '-'}</strong></div>
            <div><span>Файл доклада</span><strong>{selectedApplication.file_path ? <a href={reportFileUrl} target="_blank" rel="noreferrer">Открыть файл</a> : 'Файл не загружен'}</strong></div>
          </div>

          <div className="comment-panel">
            <span>Комментарий модератора</span>
            <p>{selectedApplication.moderator_comment || '-'}</p>
          </div>
        </div>

        {selectedApplication.status === 'accepted' && (
          <form onSubmit={submitPaymentReceipt} className="receipt-upload-panel">
            <div className="field" style={{ maxWidth: 420 }}>
              <label>Загрузка чека об оплате</label>
              <input type="file" onChange={(e) => setPaymentReceipt(e.target.files?.[0] || null)} />
            </div>
            <div className="inline-actions">
              <button className="btn-primary" type="submit">Загрузить чек</button>
            </div>
          </form>
        )}
      </section>
    );
  };

  return (
    <>
      <div className="user-layout">
        <header className="user-topbar">
          <div className="user-topbar-inner">
            <div className="user-brand-nav">
              <img className="user-logo" src="/brand/atu-logo-long.png" alt="Almaty Technological University" />
              <nav className="user-nav" aria-label="Кабинет участника">
                <button className={`user-nav-link ${['list', 'detail'].includes(view) ? 'is-active' : ''}`} type="button" onClick={goToList}>Панель</button>
                <button className={`user-nav-link ${['create', 'edit'].includes(view) ? 'is-active' : ''}`} type="button" onClick={goToCreate} disabled={!submissionEnabled}>Заявки</button>
              </nav>
            </div>

            <div className="user-topbar-actions">
              <div className="user-language" aria-label="Язык интерфейса">
                <button className="is-active" type="button">RU</button>
                <button type="button">KZ</button>
              </div>
              <details className="user-account-menu">
                <summary>{userName}</summary>
                <div>
                  <button type="button" onClick={onLogout}>Выйти</button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <div className="user-page-title">
          <div className="user-container">
            <h1>{view === 'list' ? 'Панель' : viewTitle[view]}</h1>
          </div>
        </div>

        <main className="user-main">
          <div className="user-container user-content">
            <section className="user-hero">
              <div>
                <p>Conference ATU</p>
                <h2>Кабинет участника конференции</h2>
                <span>Заявки, статусы, файлы докладов и чеки в едином рабочем интерфейсе.</span>
              </div>
              <div className="user-hero-stats">
                <div><span>Заявок</span><strong>{applicationStats.total}</strong></div>
                <div><span>На доработку</span><strong>{applicationStats.revision}</strong></div>
              </div>
            </section>

            <div className="summary-grid user-summary-grid">
              <div className="summary-item"><span>Всего</span><strong>{applicationStats.total}</strong></div>
              <div className="summary-item"><span>На рассмотрении</span><strong>{applicationStats.pending}</strong></div>
              <div className="summary-item"><span>Принято</span><strong>{applicationStats.accepted}</strong></div>
              <div className="summary-item"><span>На доработку</span><strong>{applicationStats.revision}</strong></div>
            </div>

            {message && <p className="user-message">{message}</p>}
            {error && <p className="error-text">{error}</p>}

            {view === 'list' && renderList()}
            {view === 'create' && renderFormPanel(submitCreate, 'Отправить заявку')}
            {view === 'detail' && renderDetail()}
            {view === 'edit' && renderFormPanel(submitEdit, 'Сохранить изменения')}
          </div>
        </main>
      </div>

      <Modal
        open={noticeModal.open}
        title={noticeModal.title}
        onClose={closeNotice}
        actions={<button className="btn-primary" type="button" onClick={closeNotice}>Понятно</button>}
      >
        <p style={{ margin: 0 }}>{noticeModal.message}</p>
      </Modal>
    </>
  );
}
