import { useEffect, useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';

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

const isImagePath = (path) => /\.(jpg|jpeg|png|gif|webp)$/i.test(path || '');
const isPdfPath = (path) => /\.pdf$/i.test(path || '');
const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const toReceiptUrl = (path) => `${apiOrigin}/storage/${path}`;
const toReportFileUrl = (path) => `${apiOrigin}/storage/${path}`;

export default function ModeratorDashboard({ onLogout }) {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);

  const load = async (nextStatus = status) => {
    const { data } = await api.get('/moderator/applications', { params: nextStatus ? { status: nextStatus } : {} });
    setItems(data.data ?? []);
  };

  useEffect(() => {
    load('');
  }, []);

  const updateStatus = async (id, newStatus) => {
    const moderator_comment = prompt('Комментарий модератора') || '';
    await api.patch(`/moderator/applications/${id}/status`, { status: newStatus, moderator_comment });
    await load();
  };

  const exportExcel = async () => {
    try {
      const response = await api.get('/moderator/applications-export', { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

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
      alert('Не удалось выгрузить Excel.');
    }
  };

  return (
    <AppLayout
      title="Панель модератора"
      subtitle="Управление анкетами участников"
      wide
      actions={<div style={{ display: "flex", gap: 8 }}><button className="btn-primary" onClick={exportExcel}>Экспорт в Excel</button><button className="btn-danger" onClick={onLogout}>Выйти</button></div>}
    >
      <div className="field" style={{ maxWidth: 260 }}>
        <label>Фильтр по статусу</label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value); }}>
          <option value="">Все</option>
          <option value="pending">На рассмотрении</option>
          <option value="accepted">Принято</option>
          <option value="revision">На доработку</option>
          <option value="rejected">Отклонено</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Email</th>
              <th>Номер телефона</th>
              <th>Название доклада</th>
              <th>Авторы</th>
              <th>Ученая степень, ученое звание, должность</th>
              <th>Направление</th>
              <th>Научный руководитель</th>
              <th>Должность научного руководителя</th>
              <th>Степень научного руководителя</th>
              <th>Форма участия</th>
              <th>Бронирование гостиницы</th>
              <th>Оплата</th>
              <th>Подпись</th>
              <th>Файл доклада</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((app) => {
              const receiptPath = app.payment_receipt_path;
              const receiptUrl = receiptPath ? toReceiptUrl(receiptPath) : '';
              const reportFileUrl = app.file_path ? toReportFileUrl(app.file_path) : '';

              return (
                <tr key={app.id}>
                  <td>{app.id}</td>
                  <td>{app.email}</td>
                  <td>{app.phone}</td>
                  <td>{app.report_title}</td>
                  <td>{app.full_name}</td>
                  <td>{app.academic_degree}, {app.organization_position}</td>
                  <td>{app.direction}</td>
                  <td>{app.supervisor_full_name}</td>
                  <td>{app.supervisor_organization_position}</td>
                  <td>{app.supervisor_academic_degree}</td>
                  <td>{app.participation_form}</td>
                  <td>{app.hotel_booking_needed ? 'Да' : 'Нет'}</td>
                  <td>
                    {receiptPath ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
                        <a href={receiptUrl} target="_blank" rel="noreferrer">ФАЙЛ чека</a>
                        {isImagePath(receiptPath) && (
                          <img
                            src={receiptUrl}
                            alt="Чек"
                            style={{ width: 260, maxWidth: '100%', border: '1px solid #cbd5e1', borderRadius: 6 }}
                          />
                        )}
                        {isPdfPath(receiptPath) && (
                          <iframe
                            title={`receipt-${app.id}`}
                            src={`${receiptUrl}#page=1`}
                            style={{ width: 260, height: 320, border: '1px solid #cbd5e1', borderRadius: 6 }}
                          />
                        )}
                        {!isImagePath(receiptPath) && !isPdfPath(receiptPath) && (
                          <span>Предпросмотр недоступен для этого формата</span>
                        )}
                      </div>
                    ) : 'Чек не отправлен'}
                  </td>
                  <td></td>
                  <td>
                    {app.file_path ? (
                      <a href={reportFileUrl} target="_blank" rel="noreferrer">
                        ФАЙЛ доклада
                      </a>
                    ) : (
                      'Файл не загружен'
                    )}
                  </td>
                  <td><span className={statusClass[app.status] || statusClass.pending}>{statusLabel[app.status] || app.status}</span></td>
                  <td>
                    <div className="actions">
                      <button className="btn-secondary" onClick={() => updateStatus(app.id, 'accepted')}>Принять</button>
                      <button className="btn-secondary" onClick={() => updateStatus(app.id, 'revision')}>На доработку</button>
                      <button className="btn-danger" onClick={() => updateStatus(app.id, 'rejected')}>Отказать</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

