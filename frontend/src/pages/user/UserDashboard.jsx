import { useEffect, useState } from "react";
import api from "../../api/client";
import AppLayout from "../../components/AppLayout";

const initial = {
  full_name: "",
  organization_position: "",
  academic_degree: "",
  phone: "",
  email: "",
  supervisor_full_name: "",
  supervisor_organization_position: "",
  supervisor_academic_degree: "",
  report_title: "",
  direction: "",
  participation_form: "",
  hotel_booking_needed: false,
  file: null,
};

const statusClass = {
  pending: "status status-pending",
  accepted: "status status-accepted",
  revision: "status status-revision",
  rejected: "status status-rejected",
};

const statusLabel = {
  pending: "На рассмотрении",
  accepted: "Принято",
  revision: "На доработку",
  rejected: "Отклонено",
};

const toForm = (application) => ({
  full_name: application?.full_name || "",
  organization_position: application?.organization_position || "",
  academic_degree: application?.academic_degree || "",
  phone: application?.phone || "",
  email: application?.email || "",
  supervisor_full_name: application?.supervisor_full_name || "",
  supervisor_organization_position:
    application?.supervisor_organization_position || "",
  supervisor_academic_degree: application?.supervisor_academic_degree || "",
  report_title: application?.report_title || "",
  direction: application?.direction || "",
  participation_form: application?.participation_form || "",
  hotel_booking_needed: Boolean(application?.hotel_booking_needed),
  file: null,
});

const apiBaseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;
const toReportFileUrl = (path) => `${apiOrigin}/storage/${path}`;

export default function UserDashboard({ onLogout }) {
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(initial);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [revisionMessage, setRevisionMessage] = useState("");

  const hasApplication = applications.length > 0;
  const currentApplication = applications[0] ?? null;
  const isRevision = currentApplication?.status === "revision";
  const reportFileUrl = currentApplication?.file_path
    ? toReportFileUrl(currentApplication.file_path)
    : "";

  const load = async () => {
    const { data } = await api.get("/applications");
    setApplications(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isRevision && currentApplication) {
      setForm(toForm(currentApplication));
    }
  }, [isRevision, currentApplication?.id]);

  const buildPayload = () => {
    const payload = new FormData();

    Object.entries(form).forEach(([k, v]) => {
      if (k === "file" && !v) return;
      payload.append(k, k === "hotel_booking_needed" ? Number(v) : v);
    });

    return payload;
  };

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/applications", buildPayload());
    setForm(initial);
    await load();
  };

  const submitRevision = async (e) => {
    e.preventDefault();
    setRevisionMessage("");

    if (!currentApplication) return;

    try {
      const payload = buildPayload();
      payload.append("_method", "PATCH");
      await api.post(`/applications/${currentApplication.id}`, payload);
      setRevisionMessage("Исправленная заявка отправлена на повторное рассмотрение.");
      setForm((prev) => ({ ...prev, file: null }));
      await load();
    } catch (error) {
      setRevisionMessage(
        error.response?.data?.message || "Ошибка при обновлении заявки."
      );
    }
  };

  const submitPaymentReceipt = async (e) => {
    e.preventDefault();
    setPaymentMessage("");

    if (!currentApplication || !paymentReceipt) {
      setPaymentMessage("Выберите файл чека.");
      return;
    }

    const payload = new FormData();
    payload.append("payment_receipt", paymentReceipt);

    try {
      await api.post(
        `/applications/${currentApplication.id}/payment-receipt`,
        payload
      );
      setPaymentReceipt(null);
      setPaymentMessage("Чек успешно загружен.");
      await load();
    } catch (error) {
      setPaymentMessage(
        error.response?.data?.message || "Ошибка загрузки чека."
      );
    }
  };

  const renderApplicationForm = (onSubmit, buttonLabel) => (
    <form onSubmit={onSubmit}>
      <div className="grid">
        <div className="field">
          <label>Ф.И.О.</label>
          <input
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Место учебы/работы и должность</label>
          <input
            required
            value={form.organization_position}
            onChange={(e) =>
              setForm({ ...form, organization_position: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>Ученая степень</label>
          <input
            required
            value={form.academic_degree}
            onChange={(e) =>
              setForm({ ...form, academic_degree: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>Телефон</label>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Ф.И.О. научного руководителя</label>
          <input
            required
            value={form.supervisor_full_name}
            onChange={(e) =>
              setForm({ ...form, supervisor_full_name: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>Должность научного руководителя</label>
          <input
            required
            value={form.supervisor_organization_position}
            onChange={(e) =>
              setForm({
                ...form,
                supervisor_organization_position: e.target.value,
              })
            }
          />
        </div>
        <div className="field">
          <label>Степень научного руководителя</label>
          <input
            required
            value={form.supervisor_academic_degree}
            onChange={(e) =>
              setForm({
                ...form,
                supervisor_academic_degree: e.target.value,
              })
            }
          />
        </div>
        <div className="field">
          <label>Название доклада</label>
          <input
            required
            value={form.report_title}
            onChange={(e) => setForm({ ...form, report_title: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Направление</label>
          <input
            required
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Форма участия</label>
          <input
            required
            value={form.participation_form}
            onChange={(e) =>
              setForm({ ...form, participation_form: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>Бронирование гостиницы</label>
          <select
            value={String(form.hotel_booking_needed)}
            onChange={(e) =>
              setForm({
                ...form,
                hotel_booking_needed: e.target.value === "true",
              })
            }
          >
            <option value="false">Нет</option>
            <option value="true">Да</option>
          </select>
        </div>
        <div className="field">
          <label>Файл доклада (необязательно при доработке)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
          />
        </div>
      </div>

      <div className="inline-actions">
        <button className="btn-primary" type="submit">
          {buttonLabel}
        </button>
      </div>
    </form>
  );

  return (
    <AppLayout
      title="Кабинет участника"
      subtitle="Личный раздел участника конференции"
      actions={
        <button className="btn-danger" onClick={onLogout}>
          Выйти
        </button>
      }
    >
      <p>
        <strong>Контакты оргкомитета:</strong> +7 (777) 000-00-00,
        conference@atu.edu.kz
      </p>

      {!hasApplication && renderApplicationForm(submit, "Отправить анкету")}

      {hasApplication && (
        <>
          <p>
            <strong>
              Вы уже отправили заявку. Разрешена только одна заявка на пользователя.
            </strong>
          </p>

          <div className="app-item" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Ваши данные</h3>
            <p>
              <strong>Ф.И.О.:</strong> {currentApplication.full_name}
            </p>
            <p>
              <strong>Место учебы/работы и должность:</strong>{" "}
              {currentApplication.organization_position}
            </p>
            <p>
              <strong>Ученая степень:</strong> {currentApplication.academic_degree}
            </p>
            <p>
              <strong>Телефон:</strong> {currentApplication.phone}
            </p>
            <p>
              <strong>Email:</strong> {currentApplication.email}
            </p>
            <p>
              <strong>Научный руководитель:</strong>{" "}
              {currentApplication.supervisor_full_name}
            </p>
            <p>
              <strong>Должность научного руководителя:</strong>{" "}
              {currentApplication.supervisor_organization_position}
            </p>
            <p>
              <strong>Степень научного руководителя:</strong>{" "}
              {currentApplication.supervisor_academic_degree}
            </p>
            <p>
              <strong>Название доклада:</strong> {currentApplication.report_title}
            </p>
            <p>
              <strong>Файл доклада:</strong>{" "}
              {currentApplication.file_path ? (
                <a href={reportFileUrl} target="_blank" rel="noreferrer">
                  Открыть файл
                </a>
              ) : (
                "Файл не загружен"
              )}
            </p>
            <p>
              <strong>Направление:</strong> {currentApplication.direction}
            </p>
            <p>
              <strong>Форма участия:</strong> {currentApplication.participation_form}
            </p>
            <p>
              <strong>Бронирование гостиницы:</strong>{" "}
              {currentApplication.hotel_booking_needed ? "Да" : "Нет"}
            </p>
            <p>
              <strong>Статус:</strong>{" "}
              <span
                className={statusClass[currentApplication.status] || statusClass.pending}
              >
                {statusLabel[currentApplication.status] || currentApplication.status}
              </span>
            </p>
            <p>
              <strong>Комментарий модератора:</strong>{" "}
              {currentApplication.moderator_comment || "-"}
            </p>
            <p>
              <strong>Оплата:</strong>{" "}
              {currentApplication.payment_receipt_path ? "Чек загружен" : "Чека нет"}
            </p>
          </div>

          {isRevision && (
            <>
              <h3>Доработка заявки</h3>
              {renderApplicationForm(
                submitRevision,
                "Отправить исправленную заявку"
              )}
              {revisionMessage && <p>{revisionMessage}</p>}
            </>
          )}

          {currentApplication?.status === "accepted" && (
            <form onSubmit={submitPaymentReceipt}>
              <div className="field" style={{ maxWidth: 420 }}>
                <label>Загрузка чека об оплате</label>
                <input
                  type="file"
                  onChange={(e) => setPaymentReceipt(e.target.files?.[0] || null)}
                />
              </div>
              <div className="inline-actions">
                <button className="btn-primary" type="submit">
                  Загрузить чек
                </button>
              </div>
              {paymentMessage && <p>{paymentMessage}</p>}
            </form>
          )}
        </>
      )}
    </AppLayout>
  );
}
