import PropTypes from 'prop-types';

export default function AppLayout({ title, subtitle, actions, children, wide, variant }) {
  if (variant === 'auth') {
    return (
      <div className="page page-auth">
        <div className="auth-shell">
          <aside className="auth-brand-panel">
            <img className="auth-logo" src="/brand/atu-logo-long.png" alt="Almaty Technological University" />
            <div className="auth-kicker">Conference ATU</div>
            <h1>Научная конференция АТУ</h1>
            <p>
              Единая система регистрации участников, загрузки докладов и проверки заявок
              департаментом науки.
            </p>
            <div className="auth-highlights" aria-label="Возможности системы">
              <span>Онлайн-заявки</span>
              <span>Статусы</span>
              <span>Материалы</span>
            </div>
          </aside>

          <main className="auth-card">
            <div className="auth-card-head">
              <img className="auth-card-logo" src="/brand/atu-logo.png" alt="ATU" />
              <div>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className={`container ${wide ? 'container-wide' : ''}`}>
        <header className="topbar">
          <div className="brand-block">
            <img className="brand-logo" src="/brand/atu-logo-long.png" alt="Almaty Technological University" />
            <div>
              <div className="brand">Conference ATU</div>
              <div className="muted">{subtitle}</div>
            </div>
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>

        <main className="card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Almaty Technological University</p>
              <h1 className="section-title">{title}</h1>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

AppLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
  wide: PropTypes.bool,
  variant: PropTypes.oneOf(['workspace', 'auth']),
};

AppLayout.defaultProps = {
  subtitle: '',
  actions: null,
  wide: false,
  variant: 'workspace',
};
