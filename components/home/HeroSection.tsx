"use client";

import { motion } from "motion/react";
import { Music2, Youtube, ArrowDown, Sparkles } from "lucide-react";

interface HeroSectionProps {
  title: string;
  description: string;
}

export function HeroSection({ title, description }: HeroSectionProps) {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-4 pt-24 pb-8">

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/80 backdrop-blur-sm shadow-sm">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-brand-orange">SoundCloud</span>
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" style={{ animationDelay: '0.5s' }} />
              <span className="text-brand-red">YouTube</span>
            </span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="text-foreground">Universal</span>
            <br />
            <span className="text-gradient">Music Downloader</span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Download your favorite songs and playlists from SoundCloud and YouTube.
            High quality audio, instant downloads.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex items-center justify-center gap-6 sm:gap-8 pt-2"
        >
          <StatItem icon={<Music2 className="w-4 h-4" />} label="SoundCloud" />
          <div className="w-px h-6 bg-border" />
          <StatItem icon={<Youtube className="w-4 h-4" />} label="YouTube" />
          <div className="w-px h-6 bg-border" />
          <StatItem icon={<Sparkles className="w-4 h-4" />} label="320kbps" />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="pt-6"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span>Paste a link below to start</span>
            <ArrowDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function StatItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-brand-orange">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
