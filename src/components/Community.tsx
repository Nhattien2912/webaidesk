import React from 'react'
import { SECTION_IDS } from '../config/navigation'
import { SocialList } from './SocialLinks'
import { WaitlistForm } from './WaitlistForm'

export const Community: React.FC = () => (
  <section id={SECTION_IDS.community} aria-labelledby="community-title" className="section bg-navy">
    <div className="container-content grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
      <div>
        <p className="eyebrow">Cộng đồng</p>
        <h2 id="community-title" className="section-title mt-3">
          Theo dõi AI Desk
        </h2>
        <p className="section-lead">Cập nhật phiên bản, video hướng dẫn và nơi góp ý cho đội phát triển.</p>
        <div className="mt-8">
          <SocialList />
        </div>
      </div>

      <div id={SECTION_IDS.waitlist} className="scroll-mt-24">
        <WaitlistForm />
      </div>
    </div>
  </section>
)
