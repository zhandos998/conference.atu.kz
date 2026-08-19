import { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import {
  defaultFeeSettings,
  feeCountryGroups,
  feeParticipantCategories,
  formatFeeAmount,
  normalizeFeeSettings,
  resolveApplicationFee,
} from '../../fees';
import { LanguageSwitcher, directionOptions, formatDateTime, getDirectionLabel, useI18n } from '../../i18n';

const statusClass = {
  pending: 'status status-pending',
  accepted: 'status status-accepted',
  revision: 'status status-revision',
  rejected: 'status status-rejected',
};

const statusLabel = {
  pending: 'status.pending',
  accepted: 'status.accepted',
  revision: 'status.revision',
  rejected: 'status.rejected',
};

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const toReceiptUrl = (path) => `${apiOrigin}/storage/${path}`;
const toReportFileUrl = (path) => `${apiOrigin}/storage/${path}`;
const moderatorPagePath = {
  dashboard: '/moderator',
  applications: '/moderator/applications',
  export: '/moderator/export',
};
const moderatorPageTitle = {
  dashboard: 'moderator.page.dashboard',
  applications: 'moderator.page.applications',
  applicationDetail: 'moderator.page.applicationDetail',
  export: 'moderator.page.export',
};
const getModeratorApplicationIdFromLocation = () => {
  const path = window.location.pathname.replace(/\/+$/, '');
  const match = path.match(/^\/moderator\/applications\/(\d+)$/);

  return match ? Number(match[1]) : null;
};
const getModeratorPageFromLocation = () => {
  const path = window.location.pathname.replace(/\/+$/, '');

  if (getModeratorApplicationIdFromLocation()) {
    return 'applicationDetail';
  }

  if (path.endsWith('/moderator/applications') || window.location.hash === '#filters') {
    return 'applications';
  }

  if (path.endsWith('/moderator/export') || window.location.hash === '#export') {
    return 'export';
  }

  return 'dashboard';
};

export default function ModeratorDashboard({ onLogout }) {
  const { language, t } = useI18n();
  const [activePage, setActivePage] = useState(getModeratorPageFromLocation);
  const [activeApplicationId, setActiveApplicationId] = useState(getModeratorApplicationIdFromLocation);
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState('');
  const [receipt, setReceipt] = useState('');
  const [fullNameSearch, setFullNameSearch] = useState('');
  const [reportTitleSearch, setReportTitleSearch] = useState('');
  const [items, setItems] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationDetailLoading, setApplicationDetailLoading] = useState(false);
  const [applicationDetailError, setApplicationDetailError] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, from: 0, to: 0, total: 0 });
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [statusModal, setStatusModal] = useState({ open: false, applicationId: null, newStatus: 'pending', comment: '' });
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [feeSettings, setFeeSettings] = useState(defaultFeeSettings);
  const [feeSettingsDraft, setFeeSettingsDraft] = useState(defaultFeeSettings);
  const [feeSettingsSaving, setFeeSettingsSaving] = useState(false);
  const [feeSettingsMessage, setFeeSettingsMessage] = useState('');
  const currentPageStats = items.reduce((acc, application) => {
    acc[application.status] = (acc[application.status] || 0) + 1;

    return acc;
  }, { pending: 0, accepted: 0, revision: 0, rejected: 0 });
  const activeFilterCount = [status, direction, receipt, fullNameSearch.trim(), reportTitleSearch.trim()].filter(Boolean).length;
  const todayCount = items.filter((application) => {
    if (!application.created_at) {
      return false;
    }

    return new Date(application.created_at).toDateString() === new Date().toDateString();
  }).length;
  const receiptCount = items.filter((application) => application.payment_receipt_path).length;
  const statusText = (nextStatus) => (statusLabel[nextStatus] ? t(statusLabel[nextStatus]) : nextStatus);
  const applicationFeeText = (application) => formatFeeAmount(resolveApplicationFee(application, feeSettings), language);
  const participantCategoryText = (value) => t(`fee.category.${feeParticipantCategories.includes(value) ? value : 'participant'}`);
  const countryGroupText = (value) => t(`fee.country.${feeCountryGroups.includes(value) ? value : 'kz'}`);

  const load = async (
    nextPage = pagination.currentPage,
    nextStatus = status,
    nextDirection = direction,
    nextReceipt = receipt,
    nextFullNameSearch = fullNameSearch,
    nextReportTitleSearch = reportTitleSearch,
  ) => {
    const params = { page: nextPage };
    if (nextStatus) params.status = nextStatus;
    if (nextDirection) params.direction = nextDirection;
    if (nextReceipt) params.receipt = nextReceipt;
    if (nextFullNameSearch.trim()) params.full_name = nextFullNameSearch.trim();
    if (nextReportTitleSearch.trim()) params.report_title = nextReportTitleSearch.trim();

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

  const loadFeeSettings = async () => {
    const { data } = await api.get('/moderator/application-fee-settings');
    const normalizedFees = normalizeFeeSettings(data);

    setFeeSettings(normalizedFees);
    setFeeSettingsDraft(normalizedFees);
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        load(1, '', '', '', '', ''),
        loadSubmissionSettings(),
        loadFeeSettings(),
      ]);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getModeratorPageFromLocation());
      setActiveApplicationId(getModeratorApplicationIdFromLocation());
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (activePage !== 'applicationDetail' || !activeApplicationId) {
      return;
    }

    const loadApplication = async () => {
      setApplicationDetailLoading(true);
      setApplicationDetailError('');

      try {
        const { data } = await api.get(`/moderator/applications/${activeApplicationId}`);
        setSelectedApplication(data);
      } catch (err) {
        setSelectedApplication(null);
        setApplicationDetailError(err.response?.data?.message || t('moderator.message.detailError'));
      } finally {
        setApplicationDetailLoading(false);
      }
    };

    loadApplication();
  }, [activePage, activeApplicationId]);

  const openModeratorPage = (page) => {
    setActivePage(page);
    setActiveApplicationId(null);
    window.history.pushState({}, '', moderatorPagePath[page]);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openStatusModal = (id, newStatus, currentComment = '') => {
    setStatusModal({ open: true, applicationId: id, newStatus, comment: currentComment || '' });
  };

  const closeStatusModal = () => {
    setStatusModal({ open: false, applicationId: null, newStatus: 'pending', comment: '' });
  };

  const submitStatusChange = async () => {
    try {
      const { data } = await api.patch(`/moderator/applications/${statusModal.applicationId}/status`, {
        status: statusModal.newStatus,
        moderator_comment: statusModal.comment,
      });
      if (selectedApplication?.id === statusModal.applicationId) {
        setSelectedApplication(data);
      }
      closeStatusModal();
      await load(pagination.currentPage, status, direction, receipt, fullNameSearch, reportTitleSearch);
    } catch (err) {
      setErrorModal({ open: true, message: err.response?.data?.message || t('moderator.message.statusError') });
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
      setErrorModal({ open: true, message: t('moderator.message.exportError') });
    }
  };

  const changeStatusFilter = (nextStatus) => {
    setStatus(nextStatus);
    load(1, nextStatus, direction, receipt, fullNameSearch, reportTitleSearch);
  };

  const changeDirectionFilter = (nextDirection) => {
    setDirection(nextDirection);
    load(1, status, nextDirection, receipt, fullNameSearch, reportTitleSearch);
  };

  const changeReceiptFilter = (nextReceipt) => {
    setReceipt(nextReceipt);
    load(1, status, direction, nextReceipt, fullNameSearch, reportTitleSearch);
  };

  const applySearchFilters = (e) => {
    e.preventDefault();
    load(1, status, direction, receipt, fullNameSearch, reportTitleSearch);
  };

  const resetFilters = () => {
    setStatus('');
    setDirection('');
    setReceipt('');
    setFullNameSearch('');
    setReportTitleSearch('');
    load(1, '', '', '', '', '');
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.lastPage || page === pagination.currentPage) {
      return;
    }

    load(page, status, direction, receipt, fullNameSearch, reportTitleSearch);
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
      setErrorModal({ open: true, message: err.response?.data?.message || t('moderator.message.submissionError') });
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateFeeAmount = (category, countryGroup, amount) => {
    setFeeSettingsDraft((current) => {
      const normalizedCurrent = normalizeFeeSettings(current);

      return {
        ...normalizedCurrent,
        [category]: {
          ...normalizedCurrent[category],
          [countryGroup]: {
            ...normalizedCurrent[category][countryGroup],
            amount,
          },
        },
      };
    });
  };

  const submitFeeSettings = async (e) => {
    e.preventDefault();
    setFeeSettingsSaving(true);
    setFeeSettingsMessage('');

    try {
      const { data } = await api.patch('/moderator/application-fee-settings', normalizeFeeSettings(feeSettingsDraft));
      const normalizedFees = normalizeFeeSettings(data);

      setFeeSettings(normalizedFees);
      setFeeSettingsDraft(normalizedFees);
      setFeeSettingsMessage('moderator.fees.saved');
    } catch (err) {
      setErrorModal({ open: true, message: err.response?.data?.message || t('moderator.fees.error') });
    } finally {
      setFeeSettingsSaving(false);
    }
  };

  const renderSubmissionCard = () => (
    <section className="moderator-action-card">
      <div>
        <h2>{t('moderator.submission.title')}</h2>
        <p>{t('moderator.submission.text')}</p>
      </div>
      <div className="moderator-action-controls">
        <span className={`submission-toggle-status ${submissionEnabled ? 'is-enabled' : 'is-disabled'}`}>
          {submissionEnabled ? t('moderator.submission.enabled') : t('moderator.submission.disabled')}
        </span>
        <button className="btn-primary" type="button" disabled={settingsSaving} onClick={toggleSubmission}>
          {settingsSaving ? t('moderator.submission.saving') : (submissionEnabled ? t('moderator.submission.disable') : t('moderator.submission.enable'))}
        </button>
      </div>
    </section>
  );

  const renderFeeSettingsCard = () => (
    <section className="moderator-panel moderator-fees-panel">
      <div className="moderator-panel-head">
        <div>
          <h2>{t('moderator.fees.title')}</h2>
          <p>{t('moderator.fees.text')}</p>
        </div>
      </div>

      <form className="moderator-fees-form" onSubmit={submitFeeSettings}>
        <div className="moderator-fees-grid">
          {feeParticipantCategories.map((category) => (
            feeCountryGroups.map((countryGroup) => {
              const fee = feeSettingsDraft[category][countryGroup];

              return (
                <div className="field" key={`${category}-${countryGroup}`}>
                  <label>{participantCategoryText(category)} / {countryGroupText(countryGroup)}</label>
                  <div className="fee-input-row">
                    <input
                      min="0"
                      step="1"
                      type="number"
                      value={fee.amount}
                      onChange={(e) => updateFeeAmount(category, countryGroup, e.target.value)}
                    />
                    <span>{t(fee.currency === 'USD' ? 'fee.currency.usd' : 'fee.currency.kzt')}</span>
                  </div>
                </div>
              );
            })
          ))}
        </div>

        <div className="inline-actions moderator-fees-actions">
          <button className="btn-primary" type="submit" disabled={feeSettingsSaving}>
            {feeSettingsSaving ? t('moderator.fees.saving') : t('moderator.fees.save')}
          </button>
          {feeSettingsMessage && <span className="moderator-fees-message">{t(feeSettingsMessage)}</span>}
        </div>
      </form>
    </section>
  );

  const renderDashboardPage = () => (
    <>
      <section className="moderator-hero">
        <div>
          <p>{t('moderator.dashboard.heroKicker')}</p>
          <h2>{t('moderator.dashboard.heroTitle')}</h2>
          <span>{t('moderator.dashboard.heroSubtitle')}</span>
        </div>
        <div className="moderator-hero-stats">
          <div>
            <span>{t('moderator.dashboard.today')}</span>
            <strong>{todayCount}</strong>
          </div>
          <div>
            <span>{t('moderator.dashboard.pending')}</span>
            <strong>{currentPageStats.pending}</strong>
          </div>
          <div>
            <span>{t('moderator.dashboard.withReceipt')}</span>
            <strong>{receiptCount}</strong>
          </div>
        </div>
      </section>

      <div className="moderator-kpi-grid">
        <div className="moderator-kpi-card"><span>{t('moderator.dashboard.allApplications')}</span><strong>{pagination.total}</strong></div>
        <div className="moderator-kpi-card"><span>{t('moderator.dashboard.onPage')}</span><strong>{items.length}</strong></div>
        <div className="moderator-kpi-card"><span>{t('moderator.dashboard.accepted')}</span><strong>{currentPageStats.accepted}</strong></div>
        <div className="moderator-kpi-card"><span>{t('moderator.dashboard.revision')}</span><strong>{currentPageStats.revision}</strong></div>
      </div>

      <section className="moderator-action-card">
        <div>
          <h2>{t('moderator.dashboard.applicationsTitle')}</h2>
          <p>{t('moderator.dashboard.applicationsText')}</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => openModeratorPage('applications')}>{t('moderator.dashboard.openApplications')}</button>
      </section>

      {renderSubmissionCard()}
      {renderFeeSettingsCard()}
    </>
  );

  const renderApplicationsPage = () => (
    <>
      <section className="moderator-panel">
        <div className="moderator-panel-head">
          <div>
            <h2>{t('moderator.filters.title')}</h2>
            <p>{t('moderator.filters.active', { count: activeFilterCount })}</p>
          </div>
          <button className="btn-primary" type="button" onClick={() => openModeratorPage('export')}>{t('moderator.filters.toExport')}</button>
        </div>

        <form className="filter-panel moderator-filter-panel" onSubmit={applySearchFilters}>
          <div className="field control-field">
            <label>{t('moderator.filters.status')}</label>
            <select value={status} onChange={(e) => changeStatusFilter(e.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="accepted">{t('status.accepted')}</option>
              <option value="revision">{t('status.revision')}</option>
              <option value="rejected">{t('status.rejected')}</option>
            </select>
          </div>

          <div className="field control-field control-field-wide">
            <label>{t('moderator.filters.direction')}</label>
            <select value={direction} onChange={(e) => changeDirectionFilter(e.target.value)}>
              <option value="">{t('moderator.filters.allDirections')}</option>
              {directionOptions.map((option) => (
                <option key={option.key} value={option.value}>{t(`directions.${option.key}`)}</option>
              ))}
            </select>
          </div>

          <div className="field control-field">
            <label>{t('moderator.filters.author')}</label>
            <input
              type="search"
              value={fullNameSearch}
              onChange={(e) => setFullNameSearch(e.target.value)}
              placeholder={t('moderator.filters.authorPlaceholder')}
            />
          </div>

          <div className="field control-field control-field-wide">
            <label>{t('moderator.filters.articleTitle')}</label>
            <input
              type="search"
              value={reportTitleSearch}
              onChange={(e) => setReportTitleSearch(e.target.value)}
              placeholder={t('moderator.filters.articlePlaceholder')}
            />
          </div>

          <div className="field control-field">
            <label>{t('moderator.filters.receipt')}</label>
            <select value={receipt} onChange={(e) => changeReceiptFilter(e.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="with">{t('moderator.filters.withReceipt')}</option>
              <option value="without">{t('moderator.filters.withoutReceipt')}</option>
            </select>
          </div>

          <div className="moderator-filter-actions">
            <button className="btn-primary" type="submit">{t('moderator.filters.search')}</button>
            <button className="btn-secondary" type="button" onClick={resetFilters}>{t('moderator.filters.reset')}</button>
          </div>
        </form>
      </section>

      <section className="moderator-panel moderator-table-panel">
        <div className="moderator-panel-head">
          <div>
            <h2>{t('moderator.table.title')}</h2>
            <p>{t('moderator.table.pageSummary', {
              current: pagination.currentPage,
              last: pagination.lastPage,
              shown: pagination.to,
              total: pagination.total,
            })}</p>
          </div>
        </div>

        <div className="table-wrap moderator-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('moderator.table.id')}</th>
                <th>{t('moderator.table.createdAt')}</th>
                <th>{t('moderator.table.participant')}</th>
                <th>{t('moderator.table.report')}</th>
                <th>{t('moderator.table.payment')}</th>
                <th>{t('moderator.table.status')}</th>
                <th>{t('moderator.table.actions')}</th>
                <th>{t('moderator.table.application')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state empty-state-table">
                      <h3>{t('moderator.table.emptyTitle')}</h3>
                      <p>{t('moderator.table.emptyText')}</p>
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
                    <td>{formatDateTime(app.created_at, language)}</td>
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
                        <span>{getDirectionLabel(app.direction, t)}</span>
                        {app.file_path ? <a href={reportFileUrl} target="_blank" rel="noreferrer">{t('moderator.table.reportFile')}</a> : <span>{t('moderator.table.fileMissing')}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="moderator-payment-cell">
                        <strong>{applicationFeeText(app)}</strong>
                        {receiptPath ? <a href={receiptUrl} target="_blank" rel="noreferrer">{t('moderator.table.receiptFile')}</a> : <span>{t('moderator.table.noReceipt')}</span>}
                      </div>
                    </td>
                    <td><span className={statusClass[app.status] || statusClass.pending}>{statusText(app.status)}</span></td>
                    <td>
                      <div className="actions">
                        <button className="btn-secondary" onClick={() => openStatusModal(app.id, 'accepted', app.moderator_comment)}>{t('moderator.actions.accept')}</button>
                        <button className="btn-secondary" onClick={() => openStatusModal(app.id, 'revision', app.moderator_comment)}>{t('moderator.actions.revision')}</button>
                        <button className="btn-danger" onClick={() => openStatusModal(app.id, 'rejected', app.moderator_comment)}>{t('moderator.actions.reject')}</button>
                      </div>
                    </td>
                    <td>
                      <a className="btn-secondary application-open-link" href={`/moderator/applications/${app.id}`} target="_blank" rel="noreferrer">{t('moderator.actions.openApplication')}</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination-row moderator-pagination-row">
          <div className="muted">{t('moderator.pagination.summary', {
            from: pagination.from || 0,
            to: pagination.to || 0,
            total: pagination.total,
          })}</div>
          <div className="actions">
            <button className="btn-secondary" type="button" disabled={pagination.currentPage <= 1} onClick={() => goToPage(pagination.currentPage - 1)}>{t('moderator.pagination.previous')}</button>
            <button className="btn-secondary" type="button" disabled={pagination.currentPage >= pagination.lastPage} onClick={() => goToPage(pagination.currentPage + 1)}>{t('moderator.pagination.next')}</button>
          </div>
        </div>
      </section>
    </>
  );

  const renderApplicationDetailPage = () => {
    if (applicationDetailLoading) {
      return (
        <section className="moderator-panel application-detail-page">
          <div className="moderator-panel-head">
            <div>
              <h2>{t('moderator.detail.loadingTitle')}</h2>
              <p>{t('moderator.detail.loadingText')}</p>
            </div>
          </div>
        </section>
      );
    }

    if (applicationDetailError || !selectedApplication) {
      return (
        <section className="moderator-panel application-detail-page">
          <div className="moderator-panel-head">
            <div>
              <h2>{t('moderator.detail.errorTitle')}</h2>
              <p>{applicationDetailError || t('moderator.detail.notFound')}</p>
            </div>
            <button className="btn-secondary" type="button" onClick={() => openModeratorPage('applications')}>{t('moderator.detail.backToList')}</button>
          </div>
        </section>
      );
    }

    const reportFileUrl = selectedApplication.file_path ? toReportFileUrl(selectedApplication.file_path) : '';
    const receiptUrl = selectedApplication.payment_receipt_path ? toReceiptUrl(selectedApplication.payment_receipt_path) : '';

    return (
      <>
        <section className="moderator-panel application-detail-page">
          <div className="application-detail-head">
            <div>
              <p className="section-kicker">{t('moderator.detail.applicationNumber', { id: selectedApplication.id })}</p>
              <h2>{selectedApplication.report_title}</h2>
              <p>{formatDateTime(selectedApplication.created_at, language)}</p>
            </div>
            <span className={statusClass[selectedApplication.status] || statusClass.pending}>
              {statusText(selectedApplication.status)}
            </span>
          </div>

          <div className="application-detail-actions">
            <button className="btn-secondary" type="button" onClick={() => openModeratorPage('applications')}>{t('moderator.detail.backToList')}</button>
            {selectedApplication.file_path && <a className="btn-secondary" href={reportFileUrl} target="_blank" rel="noreferrer">{t('moderator.detail.openReportFile')}</a>}
            {selectedApplication.payment_receipt_path && <a className="btn-secondary" href={receiptUrl} target="_blank" rel="noreferrer">{t('moderator.detail.openReceipt')}</a>}
          </div>

          <div className="detail-grid application-detail-grid">
            <div><span>{t('moderator.detail.fullName')}</span><strong>{selectedApplication.full_name}</strong></div>
            <div><span>{t('common.email')}</span><strong>{selectedApplication.email}</strong></div>
            <div><span>{t('moderator.detail.phone')}</span><strong>{selectedApplication.phone}</strong></div>
            <div><span>{t('moderator.detail.organizationPosition')}</span><strong>{selectedApplication.organization_position}</strong></div>
            <div><span>{t('moderator.detail.academicDegree')}</span><strong>{selectedApplication.academic_degree}</strong></div>
            <div><span>{t('user.form.participantCategory')}</span><strong>{participantCategoryText(selectedApplication.participant_category)}</strong></div>
            <div><span>{t('user.form.countryGroup')}</span><strong>{countryGroupText(selectedApplication.country_group)}</strong></div>
            <div><span>{t('fee.amountLabel')}</span><strong>{applicationFeeText(selectedApplication)}</strong></div>
            <div><span>{t('moderator.detail.department')}</span><strong>{selectedApplication.department}</strong></div>
            <div><span>{t('moderator.detail.direction')}</span><strong>{getDirectionLabel(selectedApplication.direction, t)}</strong></div>
            <div><span>{t('moderator.detail.participationForm')}</span><strong>{selectedApplication.participation_form}</strong></div>
            <div><span>{t('moderator.detail.supervisorFullName')}</span><strong>{selectedApplication.supervisor_full_name}</strong></div>
            <div><span>{t('moderator.detail.supervisorPosition')}</span><strong>{selectedApplication.supervisor_organization_position}</strong></div>
            <div><span>{t('moderator.detail.supervisorDegree')}</span><strong>{selectedApplication.supervisor_academic_degree}</strong></div>
            <div><span>{t('moderator.detail.hotelBooking')}</span><strong>{selectedApplication.hotel_booking_needed ? t('common.yes') : t('common.no')}</strong></div>
          </div>

          <div className="comment-panel">
            <span>{t('moderator.detail.comment')}</span>
            <p>{selectedApplication.moderator_comment || '-'}</p>
          </div>

          <div className="application-status-actions">
            <button className="btn-secondary" onClick={() => openStatusModal(selectedApplication.id, 'accepted', selectedApplication.moderator_comment)}>{t('moderator.actions.accept')}</button>
            <button className="btn-secondary" onClick={() => openStatusModal(selectedApplication.id, 'revision', selectedApplication.moderator_comment)}>{t('moderator.actions.revision')}</button>
            <button className="btn-danger" onClick={() => openStatusModal(selectedApplication.id, 'rejected', selectedApplication.moderator_comment)}>{t('moderator.actions.reject')}</button>
          </div>
        </section>
      </>
    );
  };

  const renderExportPage = () => (
    <>
      <section className="moderator-hero moderator-export-hero">
        <div>
          <p>{t('moderator.export.kicker')}</p>
          <h2>{t('moderator.export.title')}</h2>
          <span>{t('moderator.export.text')}</span>
        </div>
        <button className="btn-primary btn-primary-light" type="button" onClick={exportExcel}>{t('moderator.export.download')}</button>
      </section>

      <div className="moderator-kpi-grid">
        <div className="moderator-kpi-card"><span>{t('moderator.export.total')}</span><strong>{pagination.total}</strong></div>
        <div className="moderator-kpi-card"><span>{t('moderator.export.receiptsOnPage')}</span><strong>{receiptCount}</strong></div>
        <div className="moderator-kpi-card"><span>{t('moderator.export.acceptedOnPage')}</span><strong>{currentPageStats.accepted}</strong></div>
        <div className="moderator-kpi-card"><span>{t('moderator.export.rejectedOnPage')}</span><strong>{currentPageStats.rejected}</strong></div>
      </div>

      <section className="moderator-panel">
        <div className="moderator-panel-head">
          <div>
            <h2>{t('moderator.export.structureTitle')}</h2>
            <p>{t('moderator.export.structureText')}</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => openModeratorPage('applications')}>{t('moderator.dashboard.openApplications')}</button>
        </div>

        <div className="moderator-export-grid">
          <div><span>{t('common.format')}</span><strong>.xlsx</strong></div>
          <div><span>{t('common.source')}</span><strong>{t('moderator.export.applicationsSource')}</strong></div>
          <div><span>{t('common.access')}</span><strong>{t('moderator.export.moderatorOnly')}</strong></div>
        </div>
      </section>
    </>
  );

  return (
    <>
      <div className="moderator-layout">
        <aside className="moderator-sidebar">
          <div className="moderator-sidebar-main">
            <img className="moderator-sidebar-logo" src="/brand/atu-logo-long.png" alt="Almaty Technological University" />

            <div className="moderator-profile-card">
              <strong>{t('moderator.profile.role')}</strong>
              <span>{t('common.admin')}</span>
            </div>

            <nav className="moderator-nav" aria-label={t('moderator.dashboard.heroTitle')}>
              <button className={`moderator-nav-link ${activePage === 'dashboard' ? 'is-active' : ''}`} type="button" onClick={() => openModeratorPage('dashboard')}>{t('moderator.page.dashboard')}</button>
              <button className={`moderator-nav-link ${['applications', 'applicationDetail'].includes(activePage) ? 'is-active' : ''}`} type="button" onClick={() => openModeratorPage('applications')}>{t('moderator.page.applications')}</button>
              <button className={`moderator-nav-link ${activePage === 'export' ? 'is-active' : ''}`} type="button" onClick={() => openModeratorPage('export')}>{t('moderator.page.export')}</button>
            </nav>
          </div>

          <div className="moderator-sidebar-footer">
            <LanguageSwitcher className="moderator-language" />
            <button className="moderator-footer-link" type="button">{t('common.profile')}</button>
            <button className="moderator-footer-link" type="button" onClick={onLogout}>{t('common.logout')}</button>
          </div>
        </aside>

        <div className="moderator-workspace">
          <header className="moderator-topbar">
            <h1>{t(moderatorPageTitle[activePage])}</h1>
          </header>

          <main className="moderator-main">
            {activePage === 'dashboard' && renderDashboardPage()}
            {activePage === 'applications' && renderApplicationsPage()}
            {activePage === 'applicationDetail' && renderApplicationDetailPage()}
            {activePage === 'export' && renderExportPage()}
          </main>
        </div>
      </div>

      <Modal
        open={statusModal.open}
        title={t('moderator.modal.statusTitle', { status: statusText(statusModal.newStatus) })}
        onClose={closeStatusModal}
        actions={
          <>
            <button className="btn-secondary" type="button" onClick={closeStatusModal}>{t('common.cancel')}</button>
            <button className="btn-primary" type="button" onClick={submitStatusChange}>{t('common.save')}</button>
          </>
        }
      >
        <div className="field" style={{ margin: 0 }}>
          <label>{t('moderator.modal.comment')}</label>
          <textarea rows={4} value={statusModal.comment} onChange={(e) => setStatusModal((prev) => ({ ...prev, comment: e.target.value }))} placeholder={t('moderator.modal.commentPlaceholder')} />
        </div>
      </Modal>

      <Modal
        open={errorModal.open}
        title={t('common.error')}
        onClose={() => setErrorModal({ open: false, message: '' })}
        actions={<button className="btn-primary" type="button" onClick={() => setErrorModal({ open: false, message: '' })}>{t('common.understood')}</button>}
      >
        <p style={{ margin: 0 }}>{errorModal.message}</p>
      </Modal>
    </>
  );
}
