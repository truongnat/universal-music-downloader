"use client";

import { Zap, ShieldCheck, Layers, Music, Youtube, Headphones, ListMusic, Globe } from "lucide-react";
import { motion } from "motion/react";

interface FeaturesSectionProps {
  title: string;
  features: {
    speed: { title: string; description: string };
    playlist: { title: string; description: string };
    safe: { title: string; description: string };
  };
}

export function FeaturesSection({ title, features }: FeaturesSectionProps) {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="relative max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            {title}
          </h2>
          <div className="h-1 w-12 bg-gradient-to-r from-brand-orange to-brand-red rounded-full mx-auto" />
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title={features.speed.title}
            description={features.speed.description}
            iconBg="bg-brand-orange/10"
            iconColor="text-brand-orange"
            delay={0}
          />
          <FeatureCard
            icon={<Layers className="w-6 h-6" />}
            title={features.playlist.title}
            description={features.playlist.description}
            iconBg="bg-brand-red/10"
            iconColor="text-brand-red"
            delay={0.1}
          />
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title={features.safe.title}
            description={features.safe.description}
            iconBg="bg-brand-orange/10"
            iconColor="text-brand-orange"
            delay={0.2}
          />
        </div>

        {/* Platform Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PlatformBadge icon={<Music className="w-4 h-4" />} label="SoundCloud" iconColor="text-brand-orange" />
            <PlatformBadge icon={<Youtube className="w-4 h-4" />} label="YouTube" iconColor="text-brand-red" />
            <PlatformBadge icon={<Headphones className="w-4 h-4" />} label="High Quality" iconColor="text-brand-orange" />
            <PlatformBadge icon={<ListMusic className="w-4 h-4" />} label="Playlists" iconColor="text-brand-red" />
            <PlatformBadge icon={<Globe className="w-4 h-4" />} label="Free" iconColor="text-brand-orange" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  iconBg,
  iconColor,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <div className="h-full p-6 sm:p-8 rounded-2xl bg-card border border-border hover:border-border/80 hover:shadow-lg transition-all duration-300">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} ${iconColor} mb-5`}>
          {icon}
        </div>

        {/* Content */}
        <h3 className="text-lg sm:text-xl font-bold mb-3 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

function PlatformBadge({
  icon,
  label,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted transition-colors duration-200">
      <span className={iconColor}>{icon}</span>
      <span className="text-sm font-medium text-foreground/80">{label}</span>
    </div>
  );
}
