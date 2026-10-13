import { useEffect, useState } from 'react'
import { consent, hasPixels, setConsent } from '../lib/pixels.ts'

const text = {
  en: { body: 'Allow Facebook, TikTok and other ad pixels? They measure shares so more people see these bans. Nothing you type here is sent.', yes: 'Allow', no: 'No thanks' },
  bn: { body: 'ফেসবুক, টিকটক ও অন্যান্য বিজ্ঞাপন পিক্সেল চালু করবেন? এগুলো শেয়ার মাপে, যাতে আরও মানুষ এই নিষেধাজ্ঞাগুলো দেখে। আপনি যা লেখেন তা পাঠানো হয় না।', yes: 'চালু করুন', no: 'না, থাক' },
}

/** Consent for ad pixels, shown once when any pixel ID is configured. Client-only, so prerendered HTML never differs. */
export function ConsentBar() {
  const [show, setShow] = useState(false)
  useEffect(() => setShow(hasPixels && consent() === null), [])
  if (!show) return null
  const t = text[location.pathname === '/bn' || location.pathname.startsWith('/bn/') ? 'bn' : 'en']
  const pick = (v: 'yes' | 'no') => () => (setConsent(v), setShow(false))
  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Ad pixels">
      <p>{t.body}</p>
      <div>
        <button className="cbtn on" onClick={pick('yes')}>{t.yes}</button>
        <button className="cbtn" onClick={pick('no')}>{t.no}</button>
      </div>
    </div>
  )
}
