import { useEffect, useState } from 'react';
import api from '../../api/client';
import Modal from '../../components/Modal';
import {
  conferenceTypes,
  getConferenceFromPath,
  userApplicationPath,
  userConferenceBase,
} from '../../conferences';
import {
  defaultFeeSettings,
  feeCountryGroups,
  feeParticipantCategories,
  formatFeeAmount,
  normalizeFeeSettings,
  resolveApplicationFee,
} from '../../fees';
import { LanguageSwitcher, directionOptions, formatDateTime, getDirectionLabel, useI18n } from '../../i18n';

const initialForm = {
  full_name: '',
  organization_position: '',
  academic_degree: '',
  participant_category: 'participant',
  country_group: 'kz',
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

const paymentUrl = 'https://kaspi.kz/pay/ATU';

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

const toForm = (application) => ({
  full_name: application?.full_name || '',
  organization_position: application?.organization_position || '',
  academic_degree: application?.academic_degree || '',
  participant_category: application?.participant_category || 'participant',
  country_group: application?.country_group || 'kz',
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
  const match = path.match(/^\/(?:republican|international)\/applications\/(\d+)$/)
    || path.match(/^\/applications\/(\d+)$/);

  return match ? Number(match[1]) : null;
};
const viewTitle = {
  list: 'user.page.list',
  create: 'user.page.create',
  detail: 'user.page.detail',
  edit: 'user.page.edit',
};

export default function UserDashboard({ user, onLogout }) {
  const { language, t } = useI18n();
  const [activeConference, setActiveConference] = useState(getConferenceFromPath);
  const [view, setView] = useState('list');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [feeSettings, setFeeSettings] = useState(defaultFeeSettings);
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [noticeModal, setNoticeModal] = useState({ open: false, title: '', message: '' });

  const openNotice = (title, msg) => setNoticeModal({ open: true, title, message: msg });
  const closeNotice = () => setNoticeModal({ open: false, title: '', message: '' });
  const applicationStats = applications.reduce((acc, application) => {
    acc.total += 1;
    acc[application.status] = (acc[application.status] || 0) + 1;

    return acc;
  }, { total: 0, pending: 0, accepted: 0, revision: 0, rejected: 0 });
  const userName = user?.name || user?.email || t('user.fallbackName');
  const statusText = (status) => (statusLabel[status] ? t(statusLabel[status]) : status);
  const needsPayment = (application) => (
    application?.status === 'accepted' && !application?.payment_receipt_path
  );
  const paymentApplications = applications.filter(needsPayment);
  const applicationFeeText = (application) => formatFeeAmount(resolveApplicationFee(application, feeSettings), language);
  const participantCategoryText = (value) => t(`fee.category.${feeParticipantCategories.includes(value) ? value : 'participant'}`);
  const countryGroupText = (value) => t(`fee.country.${feeCountryGroups.includes(value) ? value : 'kz'}`);
  const conferenceTitle = (conferenceType) => t(`conference.${conferenceType}.title`);
  const conferenceShortTitle = (conferenceType) => t(`conference.${conferenceType}.short`);

  const loadApplications = async () => {
    const { data } = await api.get('/applications', { params: { conference: activeConference } });
    setApplications(data);
  };

  const loadSubmissionSettings = async () => {
    const { data } = await api.get('/application-submission-settings', { params: { conference: activeConference } });
    setSubmissionEnabled(Boolean(data?.enabled));
  };

  const loadFeeSettings = async () => {
    const { data } = await api.get('/application-fee-settings', { params: { conference: activeConference } });
    setFeeSettings(normalizeFeeSettings(data));
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        loadApplications(),
        loadSubmissionSettings(),
        loadFeeSettings(),
      ]);

      const applicationId = getUserApplicationIdFromLocation();
      if (applicationId) {
        await openApplication(applicationId);
      }
    };

    bootstrap();
  }, [activeConference]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveConference(getConferenceFromPath());
    };

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchConference = (conferenceType) => {
    if (conferenceType === activeConference) {
      return;
    }

    setMessage('');
    setError('');
    setPaymentReceipt(null);
    setSelectedApplication(null);
    setForm(initialForm);
    setView('list');
    setActiveConference(conferenceType);
    window.history.pushState({}, '', userConferenceBase(conferenceType));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openApplication = async (applicationId) => {
    setMessage('');
    setError('');

    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setSelectedApplication(data);
      setView('detail');
    } catch (err) {
      setError(err.response?.data?.message || t('user.message.openError'));
    }
  };

  const goToList = async ({ successMessage = '' } = {}) => {
    setMessage('');
    setError('');
    setPaymentReceipt(null);
    await Promise.all([
      loadApplications(),
      loadSubmissionSettings(),
      loadFeeSettings(),
    ]);
    setSelectedApplication(null);
    setView('list');

    if (getUserApplicationIdFromLocation()) {
      window.history.replaceState({}, '', userConferenceBase(activeConference));
    }

    if (successMessage) {
      setMessage(successMessage);
      openNotice(t('user.notice.submittedTitle'), successMessage);
    }
  };

  const goToCreate = () => {
    if (!submissionEnabled) {
      openNotice(t('user.notice.submissionDisabledTitle'), t('user.notice.submissionDisabledMessage'));
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
      openNotice(t('user.notice.resubmissionDisabledTitle'), t('user.notice.submissionDisabledMessage'));
      return;
    }

    if (selectedApplication.status !== 'revision') {
      openNotice(t('user.notice.editUnavailableTitle'), t('user.notice.editUnavailableMessage'));
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
    payload.append('conference_type', activeConference);

    return payload;
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!submissionEnabled) {
      setError(t('user.message.createBlocked'));
      return;
    }

    try {
      await api.post('/applications', buildPayload());
      await goToList({
        successMessage: t('user.notice.submittedMessage'),
      });
    } catch (err) {
      setError(err.response?.data?.message || t('user.message.createError'));
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
      setError(t('user.message.createBlocked'));
      return;
    }

    try {
      const payload = buildPayload();
      payload.append('_method', 'PATCH');
      await api.post(`/applications/${selectedApplication.id}`, payload);

      const { data } = await api.get(`/applications/${selectedApplication.id}`);
      setSelectedApplication(data);
      setMessage(t('user.message.updateSuccess'));
      setView('detail');
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || t('user.message.updateError'));
    }
  };

  const submitPaymentReceipt = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedApplication || !paymentReceipt) {
      openNotice(t('user.notice.receiptMissingTitle'), t('user.notice.receiptMissingMessage'));
      return;
    }

    const payload = new FormData();
    payload.append('payment_receipt', paymentReceipt);

    try {
      await api.post(`/applications/${selectedApplication.id}/payment-receipt`, payload);
      const { data } = await api.get(`/applications/${selectedApplication.id}`);
      setSelectedApplication(data);
      setPaymentReceipt(null);
      setMessage(t('user.message.receiptSuccess'));
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.message || t('user.message.receiptError'));
    }
  };

  const renderApplicationForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="application-form">
      {!submissionEnabled && <p className="error-text">{t('user.form.disabled')}</p>}

      <div className="form-section-title">{view === 'edit' ? t('user.form.editHint') : t('user.form.createHint')}</div>
      <div className="grid">
        <div className="field">
          <label>{t('user.form.fullName')}</label>
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.organizationPosition')}</label>
          <input required value={form.organization_position} onChange={(e) => setForm({ ...form, organization_position: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.academicDegree')}</label>
          <input required value={form.academic_degree} onChange={(e) => setForm({ ...form, academic_degree: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.participantCategory')}</label>
          <select required value={form.participant_category} onChange={(e) => setForm({ ...form, participant_category: e.target.value })}>
            {feeParticipantCategories.map((category) => (
              <option key={category} value={category}>{participantCategoryText(category)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('user.form.countryGroup')}</label>
          <select required value={form.country_group} onChange={(e) => setForm({ ...form, country_group: e.target.value })}>
            {feeCountryGroups.map((countryGroup) => (
              <option key={countryGroup} value={countryGroup}>{countryGroupText(countryGroup)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('user.form.phone')}</label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('common.email')}</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.supervisorFullName')}</label>
          <input required value={form.supervisor_full_name} onChange={(e) => setForm({ ...form, supervisor_full_name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.supervisorPosition')}</label>
          <input required value={form.supervisor_organization_position} onChange={(e) => setForm({ ...form, supervisor_organization_position: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.supervisorDegree')}</label>
          <input required value={form.supervisor_academic_degree} onChange={(e) => setForm({ ...form, supervisor_academic_degree: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.department')}</label>
          <input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.reportTitle')}</label>
          <input required value={form.report_title} onChange={(e) => setForm({ ...form, report_title: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.direction')}</label>
          <select required value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="" disabled>{t('user.form.selectDirection')}</option>
            {directionOptions.map((option) => (
              <option key={option.key} value={option.value}>{t(`directions.${option.key}`)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('user.form.participationForm')}</label>
          <input required value={form.participation_form} onChange={(e) => setForm({ ...form, participation_form: e.target.value })} />
        </div>
        <div className="field">
          <label>{t('user.form.hotelBooking')}</label>
          <select value={String(form.hotel_booking_needed)} onChange={(e) => setForm({ ...form, hotel_booking_needed: e.target.value === 'true' })}>
            <option value="false">{t('common.no')}</option>
            <option value="true">{t('common.yes')}</option>
          </select>
        </div>
        <div className="field">
          <label>{t('user.form.file')}</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
        </div>
      </div>

      <div className="inline-actions">
        <button className="btn-primary" type="submit" disabled={!submissionEnabled}>{submitLabel}</button>
        <button className="btn-secondary" type="button" onClick={goToList}>{t('user.form.backToList')}</button>
      </div>
    </form>
  );

  const renderList = () => (
    <section className="user-panel">
      <div className="user-panel-head">
        <div>
          <h2>{t(viewTitle.list)}</h2>
          <p>{t('user.list.total', { total: applicationStats.total })}</p>
        </div>
        <button className="btn-primary" type="button" onClick={goToCreate} disabled={!submissionEnabled}>{t('user.list.add')}</button>
      </div>

      {!submissionEnabled && <p className="error-text">{t('user.list.disabled')}</p>}

      {paymentApplications.length > 0 && (
        <div className="payment-notice-panel">
          <div>
            <h3>{t('user.payment.title')}</h3>
            <p>{t('user.payment.message')}</p>
            <p className="payment-amount">{t('user.payment.amount', { amount: applicationFeeText(paymentApplications[0]) })}</p>
            <p>{t('user.payment.uploadInstruction')}</p>
          </div>
          <div className="payment-notice-actions">
            <a className="btn-primary" href={paymentUrl} target="_blank" rel="noreferrer">
              {t('user.payment.payLink')}
            </a>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => openApplication(paymentApplications[0].id)}
            >
              {t('user.payment.openApplication')}
            </button>
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="empty-state">
          <h3>{t('user.list.emptyTitle')}</h3>
          <p>{t('user.list.emptyText')}</p>
        </div>
      ) : (
        <div className="user-application-list">
          {applications.map((app) => (
            <div key={app.id} className="user-application-row">
              <div>
                <div className="user-application-row-head">
                  <h3 className="app-title">{app.report_title}</h3>
                  <span className={statusClass[app.status] || statusClass.pending}>{statusText(app.status)}</span>
                </div>
                <p className="app-meta">{formatDateTime(app.created_at, language)}</p>
                {needsPayment(app) && <p className="payment-row-note">{t('user.payment.rowNotice', { amount: applicationFeeText(app) })}</p>}
              </div>
              <div className="user-row-actions">
                <a className="btn-secondary" href={userApplicationPath(activeConference, app.id)} target="_blank" rel="noreferrer">{t('user.list.openApplication')}</a>
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
          <h2>{t(viewTitle[view])}</h2>
          <p>{view === 'edit' ? t('user.form.editPanelText') : t('user.form.createPanelText')}</p>
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
            <h3>{t('user.detail.notSelected')}</h3>
          </div>
        </section>
      );
    }

    const reportFileUrl = selectedApplication.file_path ? toReportFileUrl(selectedApplication.file_path) : '';

    return (
      <section className="user-panel user-detail-section">
        <div className="user-panel-head">
          <div>
            <h2>{t(viewTitle.detail)}</h2>
            <p>{t('user.detail.applicationNumber', { id: selectedApplication.id })}</p>
          </div>
          <span className={statusClass[selectedApplication.status] || statusClass.pending}>{statusText(selectedApplication.status)}</span>
        </div>

        <div className="inline-actions user-detail-actions">
          <button className="btn-secondary" type="button" onClick={goToList}>{t('user.detail.backToList')}</button>
          <button className="btn-primary" type="button" onClick={goToEdit} disabled={!submissionEnabled}>{t('user.detail.edit')}</button>
        </div>

        <div className="detail-panel">
          <div className="detail-head">
            <div>
              <p className="section-kicker">{t('user.detail.report')}</p>
              <h2>{selectedApplication.report_title}</h2>
            </div>
          </div>

          <div className="detail-grid">
            <div><span>{t('user.form.fullName')}</span><strong>{selectedApplication.full_name}</strong></div>
            <div><span>{t('conference.fieldLabel')}</span><strong>{conferenceTitle(selectedApplication.conference_type || activeConference)}</strong></div>
            <div><span>{t('user.form.organizationPosition')}</span><strong>{selectedApplication.organization_position}</strong></div>
            <div><span>{t('user.form.academicDegree')}</span><strong>{selectedApplication.academic_degree}</strong></div>
            <div><span>{t('user.form.participantCategory')}</span><strong>{participantCategoryText(selectedApplication.participant_category)}</strong></div>
            <div><span>{t('user.form.countryGroup')}</span><strong>{countryGroupText(selectedApplication.country_group)}</strong></div>
            <div><span>{t('fee.amountLabel')}</span><strong>{applicationFeeText(selectedApplication)}</strong></div>
            <div><span>{t('user.form.phone')}</span><strong>{selectedApplication.phone}</strong></div>
            <div><span>{t('common.email')}</span><strong>{selectedApplication.email}</strong></div>
            <div><span>{t('user.form.supervisorFullName')}</span><strong>{selectedApplication.supervisor_full_name}</strong></div>
            <div><span>{t('user.form.supervisorPosition')}</span><strong>{selectedApplication.supervisor_organization_position}</strong></div>
            <div><span>{t('user.form.supervisorDegree')}</span><strong>{selectedApplication.supervisor_academic_degree}</strong></div>
            <div><span>{t('user.form.department')}</span><strong>{selectedApplication.department}</strong></div>
            <div><span>{t('user.form.direction')}</span><strong>{getDirectionLabel(selectedApplication.direction, t)}</strong></div>
            <div><span>{t('user.form.participationForm')}</span><strong>{selectedApplication.participation_form}</strong></div>
            <div><span>{t('user.form.hotelBooking')}</span><strong>{selectedApplication.hotel_booking_needed ? t('common.yes') : t('common.no')}</strong></div>
            <div><span>{t('user.detail.createdAt')}</span><strong>{formatDateTime(selectedApplication.created_at, language)}</strong></div>
            <div><span>{t('user.detail.reportFile')}</span><strong>{selectedApplication.file_path ? <a href={reportFileUrl} target="_blank" rel="noreferrer">{t('user.detail.openFile')}</a> : t('user.detail.fileMissing')}</strong></div>
          </div>

          <div className="comment-panel">
            <span>{t('user.detail.moderatorComment')}</span>
            <p>{selectedApplication.moderator_comment || '-'}</p>
          </div>
        </div>

        {selectedApplication.status === 'accepted' && (
          <form onSubmit={submitPaymentReceipt} className="receipt-upload-panel">
            <div className={needsPayment(selectedApplication) ? 'receipt-payment-notice' : 'receipt-uploaded-notice'}>
              <strong>{needsPayment(selectedApplication) ? t('user.payment.title') : t('user.payment.receiptUploaded')}</strong>
              {needsPayment(selectedApplication) && (
                <>
                  <p>{t('user.payment.message')}</p>
                  <p className="payment-amount">{t('user.payment.amount', { amount: applicationFeeText(selectedApplication) })}</p>
                  <div className="inline-actions receipt-payment-actions">
                    <a className="btn-primary" href={paymentUrl} target="_blank" rel="noreferrer">
                      {t('user.payment.payLink')}
                    </a>
                  </div>
                  <p>{t('user.payment.uploadInstruction')}</p>
                </>
              )}
            </div>
            <div className="field" style={{ maxWidth: 420 }}>
              <label>{t('user.receipt.upload')}</label>
              <input type="file" onChange={(e) => setPaymentReceipt(e.target.files?.[0] || null)} />
            </div>
            <div className="inline-actions">
              <button className="btn-primary" type="submit">{t('user.receipt.submit')}</button>
            </div>
          </form>
        )}
      </section>
    );
  };

  const renderConferenceChoice = () => (
    <section className="conference-choice-panel" aria-labelledby="conference-choice-title">
      <div className="conference-choice-copy">
        <h2 id="conference-choice-title">{t('conference.selectorTitle')}</h2>
        <p>{t('conference.selectorText')}</p>
      </div>
      <div className="conference-choice-options">
        {conferenceTypes.map((conferenceType) => (
          <button
            className={`conference-choice-option ${conferenceType === activeConference ? 'is-active' : ''}`}
            key={conferenceType}
            type="button"
            onClick={() => switchConference(conferenceType)}
          >
            <strong>{conferenceShortTitle(conferenceType)}</strong>
            <span>{conferenceTitle(conferenceType)}</span>
            <small>{conferenceType === activeConference ? t('conference.selected') : t('conference.choose')}</small>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <>
      <div className="user-layout">
        <header className="user-topbar">
          <div className="user-topbar-inner">
            <div className="user-brand-nav">
              <img className="user-logo" src="/brand/atu-logo-long.png" alt="Almaty Technological University" />
              <nav className="user-nav" aria-label={t('user.hero.title')}>
                <button className={`user-nav-link ${['list', 'detail'].includes(view) ? 'is-active' : ''}`} type="button" onClick={goToList}>{t('user.nav.dashboard')}</button>
                <button className={`user-nav-link ${['create', 'edit'].includes(view) ? 'is-active' : ''}`} type="button" onClick={goToCreate} disabled={!submissionEnabled}>{t('user.nav.applications')}</button>
              </nav>
              <div className="conference-switcher" aria-label={t('conference.switcherLabel')}>
                {conferenceTypes.map((conferenceType) => (
                  <button
                    className={conferenceType === activeConference ? 'is-active' : ''}
                    key={conferenceType}
                    type="button"
                    onClick={() => switchConference(conferenceType)}
                  >
                    {conferenceShortTitle(conferenceType)}
                  </button>
                ))}
              </div>
            </div>

            <div className="user-topbar-actions">
              <LanguageSwitcher className="user-language" />
              <details className="user-account-menu">
                <summary>{userName}</summary>
                <div>
                  <button type="button" onClick={onLogout}>{t('common.logout')}</button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <div className="user-page-title">
          <div className="user-container">
            <h1>{conferenceTitle(activeConference)}</h1>
          </div>
        </div>

        <main className="user-main">
          <div className="user-container user-content">
            {renderConferenceChoice()}

            <section className="user-hero">
              <div>
                <p>{t('user.hero.kicker')}</p>
                <h2>{conferenceTitle(activeConference)}</h2>
                <span>{t('user.hero.subtitle')}</span>
              </div>
              <div className="user-hero-stats">
                <div><span>{t('user.hero.applications')}</span><strong>{applicationStats.total}</strong></div>
                <div><span>{t('user.hero.revision')}</span><strong>{applicationStats.revision}</strong></div>
              </div>
            </section>

            <div className="summary-grid user-summary-grid">
              <div className="summary-item"><span>{t('user.summary.total')}</span><strong>{applicationStats.total}</strong></div>
              <div className="summary-item"><span>{t('user.summary.pending')}</span><strong>{applicationStats.pending}</strong></div>
              <div className="summary-item"><span>{t('user.summary.accepted')}</span><strong>{applicationStats.accepted}</strong></div>
              <div className="summary-item"><span>{t('user.summary.revision')}</span><strong>{applicationStats.revision}</strong></div>
            </div>

            {message && <p className="user-message">{message}</p>}
            {error && <p className="error-text">{error}</p>}

            {view === 'list' && renderList()}
            {view === 'create' && renderFormPanel(submitCreate, t('user.form.submitCreate'))}
            {view === 'detail' && renderDetail()}
            {view === 'edit' && renderFormPanel(submitEdit, t('user.form.submitEdit'))}
          </div>
        </main>
      </div>

      <Modal
        open={noticeModal.open}
        title={noticeModal.title}
        onClose={closeNotice}
        actions={<button className="btn-primary" type="button" onClick={closeNotice}>{t('common.understood')}</button>}
      >
        <p style={{ margin: 0 }}>{noticeModal.message}</p>
      </Modal>
    </>
  );
}
