import PropTypes from 'prop-types';

export default function AppLayout({ title, subtitle, actions, children, wide }) {
  return (
    <div className="page">
      <div className={`container ${wide ? 'container-wide' : ''}`}>
        <header className="topbar">
          <div>
            <div className="brand">ATU Conference</div>
            <div className="muted">{subtitle}</div>
          </div>
          <div>{actions}</div>
        </header>

        <main className="card">
          <h1 className="section-title">{title}</h1>
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
};

AppLayout.defaultProps = {
  subtitle: '',
  actions: null,
  wide: false,
};
