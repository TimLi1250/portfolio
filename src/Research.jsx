import radarCameraFigure from "./assets/radar-camera-hand-pose-comparison.png";

export default function Research() {
  return (
    <section id="research" className="content-section">
      <p className="section-title">Research</p>
      <div className="section-body research-list">
        <article className="research-entry">
          <div className="research-entry-heading">
            <div>
              <h3>Yale Vision Lab</h3>
              <p className="research-dates">2025 – Present</p>
            </div>
            <p className="research-lab">Yale University</p>
          </div>
          <p>Radar–Camera 3D hand pose estimation employing semantic and geometric transfers.</p>
          <figure className="research-figure">
            <img src={radarCameraFigure} alt="A comparison of hand-pose estimates across full, medium, and low illumination conditions." />
            <figcaption>Hand-pose estimates across changing illumination conditions.</figcaption>
          </figure>

          <p className="research-paper-status"><strong>(Paper Under Review)</strong></p>
        </article>
        <article className="research-entry">
          <div className="research-entry-heading">
            <div>
              <h3>Yale APOLLO Lab</h3>
              <p className="research-dates">2025</p>
            </div>
            <p className="research-lab">Yale University</p>
          </div>
          <p>Implemented markerless localization from a single camera and integrated dynamic masking to track object removal and replacement from the camera’s viewpoint.</p>
          <a className="research-link" href="https://github.com/TimLi1250/Mask-Generation" target="_blank" rel="noreferrer"><strong>Markerless Localization</strong></a>
        </article>
      </div>
    </section>
  );
}
