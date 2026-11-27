"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";

export function MarketingBrand() {
  return <Link className="marketing-brand" href="/" aria-label="SchoolOS home"><span className="marketing-brand-mark"><GraduationCap size={23} strokeWidth={2.1} /></span><span className="marketing-brand-word">School<span>OS</span><small>BY TTECHNOLOGIES</small></span></Link>;
}

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".marketing-header")) setMenuOpen(false);
    };
    const onResize = () => { if (window.innerWidth > 1000) setMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);
  return <header className="marketing-header"><div className="marketing-container marketing-header-inner"><MarketingBrand /><nav aria-label="Main navigation"><Link href="/#platform">Platform</Link><Link href="/#how-it-works">How it works</Link><Link href="/#questions">Questions</Link></nav><div className="marketing-header-actions"><Link className="marketing-text-link" href="/login">Sign in</Link><Link className="marketing-button marketing-button-demo" href="/schedule-demo">Request a demo</Link></div><div className="marketing-mobile-menu"><button type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="marketing-mobile-links" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>{menuOpen && <nav id="marketing-mobile-links" aria-label="Mobile navigation"><Link href="/#platform" onClick={() => setMenuOpen(false)}>Platform</Link><Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link><Link href="/#questions" onClick={() => setMenuOpen(false)}>Questions</Link><Link href="/login" onClick={() => setMenuOpen(false)}>Sign in</Link><Link href="/schedule-demo" onClick={() => setMenuOpen(false)}>Request a demo</Link></nav>}</div></div></header>;
}

export function MarketingFooter() {
  return <footer className="marketing-footer"><div className="marketing-container marketing-footer-grid"><div><MarketingBrand /><p>A simpler way to run your school.</p></div><div><Link href="/#platform">Platform</Link><Link href="/#how-it-works">Getting started</Link><Link href="/schedule-demo">Schedule a demo</Link><Link href="/login">Sign in</Link></div><small>© {new Date().getFullYear()} SchoolOS by TTechnologies</small></div></footer>;
}
