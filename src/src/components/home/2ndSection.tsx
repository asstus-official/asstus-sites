import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './2ndSection.module.css';

type FeatureItem = {
  title: string;
  Svg?: React.ComponentType<React.ComponentProps<'svg'>>;
  gifSrc?: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Simple implementation',
    gifSrc: require('@site/static/img/undraw_docusaurus_mountain.gif').default,
    description: (
      <>
        Asstus was designed from the ground up to be easily cleaned all messy raws data and 
        used to get your dashboard up and running quickly even low tech-savvy
      </>
    ),
  },
  {
    title: 'intelligent traceability',
    gifSrc: require('@site/static/img/undraw_docusaurus_tree.gif').default,
    description: (
      <>
        Asstus lets you focus on hidden threats, and we&apos;ll do the chores. Go
        ahead and move messy raws data into our application.
      </>
    ),
  },
  {
    title: 'Cognitive Assistant',
    gifSrc: require('@site/static/img/undraw_docusaurus_react.gif').default,
    description: (
      <>
        Co-train to customize report's charts by chatting with our Cognitive Expert Engine which empowered Asstus can
        be learnt your knowledge for reusing other same sittuations.
      </>
    ),
  },
];

function Feature({title, Svg, gifSrc, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        {gifSrc ? (
          <img 
            src={gifSrc} 
            alt={title}
            className={styles.featureGif} 
          />
        ) : (
          <Svg className={styles.featureSvg} role="img" />
        )}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function SecondSection(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}