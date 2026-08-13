function RepositoryIcon({ label }) {
  return (
    <span className="repository-icon" aria-hidden="true"><span>{label}</span><i /></span>
  );
}

export default function Education() {
  const repositories = [
    {
      mark: "R",
      name: "Recruiting/Leetcode Prep",
      description: "A lot of random notes I took for software engineering recruiting.",
      href: "https://github.com/TimLi1250/Recruiting",
    },
    {
      mark: "ML",
      name: "Machine Learning Notes",
      description: "A collection of machine-learning notes and random experimentation.",
      href: "https://github.com/TimLi1250/ML",
    },
  ];

  return (
    <section id="education" className="content-section">
      <p className="section-title">Education</p>
      <div className="section-body repository-list">
        {repositories.map((repository) => (
          <article className="repository-card" key={repository.name}>
            <a className="repository-icon-link" href={repository.href} target="_blank" rel="noreferrer" aria-label={`Open ${repository.name} repository`}><RepositoryIcon label={repository.mark} /></a>
            <div>
              <h3>{repository.name}</h3>
              <p>{repository.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
