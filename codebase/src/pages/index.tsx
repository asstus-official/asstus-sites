import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import FirstSection from '@site/src/components/home/1stSection';
import SecondSection from '@site/src/components/home/2ndSection';
import ThirdSection from '@site/src/components/home/3rdSection';
import FourthSection from '@site/src/components/home/4thSection';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Decarbonizing creative industries <head />">
      <main>
        <FirstSection />
        <SecondSection />
        <ThirdSection />
        <FourthSection />
      </main>
    </Layout>
  );
}