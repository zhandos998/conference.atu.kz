import { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';

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

const directionOptions = [
  'Технология пищевых и перерабатывающих производств',
  'Легкая и текстильная промышленность',
  'Механизация, автоматизация и информатизация технологических процессов',
  'Общеэкономические проблемы, индустрия гостеприимства',
  'Естественные науки',
  'Социально-гуманитарные науки',
];

const isImagePath = (path) => /\.(jpg|jpeg|png|gif|webp)$/i.test(path || '');
const isPdfPath = (path) => /\.pdf$/i.test(path || '');
const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const toReceiptUrl = (path) => `${apiOrigin}/storage/${path}`;
const toReportFileUrl = (path) => `${apiOrigin}/storage/${path}`;

export default function ModeratorDashboard({ onLogout }) {
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [receipt, setReceipt] = useState('');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, from: 0, to: 0, total: 0 });
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [statusModal, setStatusModal] = useState({ open: false, applicationId: null, newStatus: 'pending', comment: '' });
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const currentPageStats = items.reduce((acc, application) => {
    acc[application.status] = (acc[application.status] || 0) + 1;

    return acc;
  }, { pending: 0, accepted: 0, revision: 0, rejected: 0 });
  const activeFilterCount = [status, direction, receipt].filter(Boolean).length;
  const todayCount = items.filter((application) => {
    if (!application.created_at) {
      return false;
    }

    return new Date(application.created_at).toDateString() === new Date().toDateString();
  }).length;
  const receiptCount = items.filter((application) => application.payment_receipt_path).length;

  const load = async (
    nextPage = pagination.currentPage,
    nextStatus = status,
    nextDirection = direction,
    nextReceipt = receipt,
  ) => {
    const params = { page: nextPage };
    if (nextStatus) params.status = nextStatus;
    if (nextDirection) params.direction = nextDirection;
    if (nextReceipt) params.receipt = nextReceipt;

    const { data } = await api.get('/moderator/applications', { params });

    setItems(data.data ?? []);
    setPagination({
      currentPage: data.current_page ?? 1,
      lastPage: data.last_page ?? 1,
      from: data.from ?? 0,
      to: data.to ?? 0,
      total: data.total ?? 0,
    });
  };

  const loadSubmissionSettings = async () => {
    const { data } = await api.get('/moderator/application-submission-settings');
    setSubmissionEnabled(Boolean(data?.enabled));
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        load(1, '', '', ''),
        loadSubmissionSettings(),
      ]);
    };

    bootstrap();
  }, []);

  const openStatusModal = (id, newStatus, currentComment = '') => {
    setStatusModal({ open: true, applicationId: id, newStatus, comment: currentComment || '' });
  };

  const closeStatusModal = () => {
    setStatusModal({ open: false, applicationId: null, newStatus: 'pending', comment: '' });
  };

  const submitStatusChange = async () => {
    try {
      await api.patch(`/moderator/applications/${statusModal.applicationId}/status`, {
        status: statusModal.newStatus,
        moderator_comment: statusModal.comment,
      });
      closeStatusModal();
      await load(pagination.currentPage, status, direction, receipt);
    } catch (err) {
      setErrorModal({ open: true, message: err.response?.data?.message || 'Не удалось изменить статус заявки.' });
    }
  };

  const exportExcel = async () => {
    try {
      const response = await api.get('/moderator/applications-export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const contentDisposition = response.headers['content-disposition'] || '';
      const matched = contentDisposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
      const backendFileName = matched?.[1] ? decodeURIComponent(matched[1].replace(/\"/g, '').trim()) : '';
      const fallbackName = `conference_application_${new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '')}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backendFileName || fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorModal({ open: true, message: 'Не удалось выгрузить Excel.' });
    }
  };

  const changeStatusFilter = (nextStatus) => {
    setStatus(nextStatus);
    load(1, nextStatus, direction, receipt);
  };

  const changeDirectionFilter = (nextDirection) => {
    setDirection(nextDirection);
    load(1, status, nextDirection, receipt);
  };

  const changeReceiptFilter = (nextReceipt) => {
    setReceipt(nextReceipt);
    load(1, status, direction, nextReceipt);
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.lastPage || page === pagination.currentPage) {
      return;
    }

    load(page, status, direction, receipt);
  };

  const toggleSubmission = async () => {
    const nextValue = !submissionEnabled;
    setSettingsSaving(true);

    try {
      const { data } = await api.patch('/moderator/application-submission-settings', {
        enabled: nextValue,
      });
      setSubmissionEnabled(Boolean(data?.enabled));
    } catch (err) {
      setErrorModal({ open: true, message: err.response?.data?.message || 'Не удалось обновить настройку приема заявок.' });
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <>
      <div className="moderator-layout">
        <aside className="moderator-sidebar">
          <div className="moderator-sidebar-main">
            <img className="moderator-sidebar-logo" src="/brand/atu-logo-long.png" alt="Almaty Technological University" />

            <div className="moderator-profile-card">
              <strong>Модератор</strong>
              <span>Админ</span>
            </div>

            <nav className="moderator-nav" aria-label="Панель модератора">
              <a className="moderator-nav-link is-active" href="#panel">Панель</a>
              <a className="moderator-nav-link" href="#filters">Заявки</a>
              <button className="moderator-nav-link" type="button" onClick={exportExcel}>Экспорт</button>
            </nav>
          </div>

          <div className="moderator-sidebar-footer">
            <div className="moderator-language" aria-label="Язык интерфейса">
              <button className="is-active" type="button">RU</button>
              <button type="button">KZ</button>
            </div>
            <button className="moderator-footer-link" type="button">Профиль</button>
            <button className="moderator-footer-link" type="button" onClick={onLogout}>Выйти</button>
          </div>
        </aside>

        <div className="moderator-workspace">
          <header className="moderator-topbar">
            <h1>Панель</h1>
          </header>

          <main className="moderator-main" id="panel">
            <section className="moderator-hero">
              <div>
                <p>Conference ATU</p>
                <h2>Панель модератора конференции</h2>
                <span>Проверка заявок, управление статусами, прием чеков и экспорт данных в одном рабочем интерфейсе.</span>
              </div>
              <div className="moderator-hero-stats">
                <div>
                  <span>Сегодня</span>
                  <strong>{todayCount}</strong>
                </div>
                <div>
                  <span>На рассмотрении</span>
                  <strong>{currentPageStats.pending}</strong>
                </div>
                <div>
                  <span>С чеком</span>
                  <strong>{receiptCount}</strong>
                </div>
              </div>
            </section>

            <div className="moderator-kpi-grid">
              <div className="moderator-kpi-card"><span>Все заявки</span><strong>{pagination.total}</strong></div>
              <div className="moderator-kpi-card"><span>На странице</span><strong>{items.length}</strong></div>
              <div className="moderator-kpi-card"><span>Принято</span><strong>{currentPageStats.accepted}</strong></div>
              <div className="moderator-kpi-card"><span>На доработку</span><strong>{currentPageStats.revision}</strong></div>
            </div>

            <section className="moderator-action-card">
              <div>
                <h2>Прием заявок</h2>
                <p>Переключатель управляет возможностью отправлять новые и исправленные заявки участниками.</p>
              </div>
              <div className="moderator-action-controls">
                <span className={`submission-toggle-status ${submissionEnabled ? 'is-enabled' : 'is-disabled'}`}>
                  {submissionEnabled ? 'Включен' : 'Отключен'}
                </span>
                <button className="btn-primary" type="button" disabled={settingsSaving} onClick={toggleSubmission}>
                  {settingsSaving ? 'Сохранение...' : (submissionEnabled ? 'Отключить' : 'Включить')}
                </button>
              </div>
            </section>

            <section className="moderator-panel" id="filters">
              <div className="moderator-panel-head">
                <div>
                  <h2>Фильтры заявок</h2>
                  <p>Активных фильтров: {activeFilterCount}</p>
                </div>
                <button className="btn-primary" type="button" onClick={exportExcel}>Экспорт в Excel</button>
              </div>

              <div className="filter-panel moderator-filter-panel">
                <div className="field control-field">
                  <label>Фильтр по статусу</label>
                  <select value={status} onChange={(e) => changeStatusFilter(e.target.value)}>
                    <option value="">Все</option>
                    <option value="pending">На рассмотрении</option>
                    <option value="accepted">Принято</option>
                    <option value="revision">На доработку</option>
                    <option value="rejected">Отклонено</option>
                  </select>
                </div>

                <div className="field control-field control-field-wide">
                  <label>Фильтр по направлению</label>
                  <select value={direction} onChange={(e) => changeDirectionFilter(e.target.value)}>
                    <option value="">Все направления</option>
                    {directionOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="field control-field">
                  <label>Фильтр по чеку</label>
                  <select value={receipt} onChange={(e) => changeReceiptFilter(e.target.value)}>
                    <option value="">Все</option>
                    <option value="with">С чеком</option>
                    <option value="without">Без чека</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="moderator-panel moderator-table-panel">
              <div className="moderator-panel-head">
                <div>
                  <h2>Заявки участников</h2>
                  <p>Страница {pagination.currentPage} из {pagination.lastPage}. Показано {pagination.to} из {pagination.total} заявок.</p>
                </div>
                <div className="moderator-panel-actions">
                  <button className="btn-secondary" type="button" onClick={exportExcel}>Экспорт</button>
                </div>
              </div>

              <div className="table-wrap moderator-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Дата создания</th>
                      <th>Участник</th>
                      <th>Доклад</th>
                      <th>Оплата</th>
                      <th>Статус</th>
                      <th>Действия</th>
                      <th>Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td colSpan="8">
                          <div className="empty-state empty-state-table">
                            <h3>Заявок не найдено</h3>
                            <p>Измените фильтры или проверьте прием новых заявок.</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {items.map((app) => {
                      const receiptPath = app.payment_receipt_path;
                      const receiptUrl = receiptPath ? toReceiptUrl(receiptPath) : '';
                      const reportFileUrl = app.file_path ? toReportFileUrl(app.file_path) : '';

                      return (
                        <tr key={app.id}>
                          <td>{app.id}</td>
                          <td>{app.created_at ? new Date(app.created_at).toLocaleString('ru-RU') : '-'}</td>
                          <td>
                            <div className="moderator-person-cell">
                              <strong>{app.full_name}</strong>
                              <span>{app.email}</span>
                              <span>{app.phone}</span>
                            </div>
                          </td>
                          <td>
                            <div className="moderator-report-cell">
                              <strong>{app.report_title}</strong>
                              <span>{app.direction}</span>
                              {app.file_path ? <a href={reportFileUrl} target="_blank" rel="noreferrer">Файл доклада</a> : <span>Файл не загружен</span>}
                            </div>
                          </td>
                          <td>{receiptPath ? <a href={receiptUrl} target="_blank" rel="noreferrer">Файл чека</a> : 'Нет'}</td>
                          <td><span className={statusClass[app.status] || statusClass.pending}>{statusLabel[app.status] || app.status}</span></td>
                          <td>
                            <div className="actions">
                              <button className="btn-secondary" onClick={() => openStatusModal(app.id, 'accepted', app.moderator_comment)}>Принять</button>
                              <button className="btn-secondary" onClick={() => openStatusModal(app.id, 'revision', app.moderator_comment)}>На доработку</button>
                              <button className="btn-danger" onClick={() => openStatusModal(app.id, 'rejected', app.moderator_comment)}>Отказать</button>
                            </div>
                          </td>
                          <td>
                            <details className="moderator-row-details">
                              <summary>Открыть</summary>
                              <dl>
                                <div>
                                  <dt>Ученая степень, звание, должность</dt>
                                  <dd>{app.academic_degree}, {app.organization_position}</dd>
                                </div>
                                <div>
                                  <dt>Научный руководитель</dt>
                                  <dd>{app.supervisor_full_name}</dd>
                                </div>
                                <div>
                                  <dt>Должность руководителя</dt>
                                  <dd>{app.supervisor_organization_position}</dd>
                                </div>
                                <div>
                                  <dt>Степень руководителя</dt>
                                  <dd>{app.supervisor_academic_degree}</dd>
                                </div>
                                <div>
                                  <dt>Кафедра</dt>
                                  <dd>{app.department}</dd>
                                </div>
                                <div>
                                  <dt>Форма участия</dt>
                                  <dd>{app.participation_form}</dd>
                                </div>
                                <div>
                                  <dt>Бронирование гостиницы</dt>
                                  <dd>{app.hotel_booking_needed ? 'Да' : 'Нет'}</dd>
                                </div>
                                <div>
                                  <dt>Комментарий модератора</dt>
                                  <dd>{app.moderator_comment || '-'}</dd>
                                </div>
                                {receiptPath && (
                                  <div>
                                    <dt>Предпросмотр чека</dt>
                                    <dd>
                                      <div className="receipt-preview">
                                        {isImagePath(receiptPath) && <img className="receipt-media" src={receiptUrl} alt="Чек" />}
                                        {isPdfPath(receiptPath) && <iframe className="receipt-frame" title={`receipt-${app.id}`} src={`${receiptUrl}#page=1`} />}
                                        {!isImagePath(receiptPath) && !isPdfPath(receiptPath) && <span>Предпросмотр недоступен для этого формата</span>}
                                      </div>
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination-row moderator-pagination-row">
                <div className="muted">Показано {pagination.from || 0}-{pagination.to || 0} из {pagination.total} заявок</div>
                <div className="actions">
                  <button className="btn-secondary" type="button" disabled={pagination.currentPage <= 1} onClick={() => goToPage(pagination.currentPage - 1)}>Назад</button>
                  <button className="btn-secondary" type="button" disabled={pagination.currentPage >= pagination.lastPage} onClick={() => goToPage(pagination.currentPage + 1)}>Вперед</button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <Modal
        open={statusModal.open}
        title={`Изменить статус: ${statusLabel[statusModal.newStatus] || statusModal.newStatus}`}
        onClose={closeStatusModal}
        actions={
          <>
            <button className="btn-secondary" type="button" onClick={closeStatusModal}>Отмена</button>
            <button className="btn-primary" type="button" onClick={submitStatusChange}>Сохранить</button>
          </>
        }
      >
        <div className="field" style={{ margin: 0 }}>
          <label>Комментарий модератора</label>
          <textarea rows={4} value={statusModal.comment} onChange={(e) => setStatusModal((prev) => ({ ...prev, comment: e.target.value }))} placeholder="Добавьте комментарий при необходимости" />
        </div>
      </Modal>

      <Modal
        open={errorModal.open}
        title="Ошибка"
        onClose={() => setErrorModal({ open: false, message: '' })}
        actions={<button className="btn-primary" type="button" onClick={() => setErrorModal({ open: false, message: '' })}>Понятно</button>}
      >
        <p style={{ margin: 0 }}>{errorModal.message}</p>
      </Modal>
    </>
  );
}
