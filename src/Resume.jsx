import barclaysLogo from "./assets/barclays-logo.svg";

export default function Resume() {

  return (
    <section id="resume" className="content-section resume-section">
      <p className="section-title">Work Experience</p>
      <div className="section-body resume-body">
        <div className="experience-list">
          <article className="experience-row">
            <span className="experience-mark"><img src={barclaysLogo} alt="Barclays logo" /></span>
            <h3>Software Engineer Intern</h3>
            <p>Barclays</p>
            <time>Summer 2026</time>
          </article>
        </div>
        <a className="arrow-link" href="https://drive.google.com/file/d/1C71IPKctFUtiuuSESJj4FfwwYbeCa1ba/view?usp=sharing" target="_blank" rel="noopener noreferrer">
          <strong>Resume</strong>
        </a>
      </div>
    </section>
  );
}
