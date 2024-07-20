import React from "react";
import ThreeApp from "./ThreeApp";
import styles from "./InfoPanel.module.css";

type DiscographyData = (typeof ThreeApp.DISCOGRAPHY_DATA)[0];

interface InfoPanelProps {
  selectedIndex: number;
  isLandscape: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  selectedIndex,
  isLandscape,
}) => {
  const data: DiscographyData = ThreeApp.DISCOGRAPHY_DATA[selectedIndex];

  return (
    <div
      className={`${styles.infoPanel} ${
        isLandscape ? styles.landscapePanel : ""
      }`}
    >
      <h2 className={styles.title}>{data.title}</h2>

      <div className={styles.infoSection}>
        <p className={styles.label}>Release Date:</p>
        <p>{data.release_date || "N/A"}</p>
      </div>

      <div className={styles.infoSection}>
        <p className={styles.label}>Featured Artists:</p>
        {data.feat.map((artist, index) => (
          <div key={index} className={styles.featArtist}>
            <p>
              {artist.role}: {artist.name}
            </p>
          </div>
        ))}
      </div>

      <div className={styles.infoSection}>
        <p className={styles.label}>Streaming:</p>
        <a href={data.Streaming} className={styles.link}>
          Listen Now
        </a>
      </div>

      <div className={styles.infoSection}>
        <p className={styles.label}>MV:</p>
        <a href={data.MV} className={styles.link}>
          Watch Video
        </a>
      </div>
    </div>
  );
};

export default InfoPanel;
