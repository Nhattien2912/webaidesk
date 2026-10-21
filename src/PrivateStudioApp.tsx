import { useEffect } from 'react'
import { StudioPage } from './pages/StudioPage'
import './pages/studio.css'

export default function PrivateStudioApp(){
  useEffect(()=>{
    document.title='AI Desk Studio — Private Admin'
    let robots=document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots)}
    robots.content='noindex, nofollow, noarchive'
  },[])
  return <StudioPage />
}
