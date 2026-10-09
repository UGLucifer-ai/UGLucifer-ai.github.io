import type { CSSProperties, ReactNode } from "react";
import { asset } from "@/lib/data";

/**
 * Brand + concept logo registry.
 * BRAND: official devicon "original" SVGs (MIT) and simple-icons paths (CC0,
 *        coloured with the official brand hex) copied into /public/logos.
 * CONCEPT: custom thin line icons for non-brand skills (same visual weight).
 */

export type BrandEntry = {
  label: string;
  file: string;
  /** Official brand colour, used only for the soft tint glow. */
  tint: string;
  source: "devicon" | "simple-icons";
};

export const BRAND: Record<string, BrandEntry> = {
  "docker": { label: "Docker", file: "/logos/docker.svg", tint: "#2496ED", source: "devicon" },
  "kubernetes": { label: "Kubernetes", file: "/logos/kubernetes.svg", tint: "#326CE5", source: "devicon" },
  "aws": { label: "AWS", file: "/logos/aws.svg", tint: "#FF9900", source: "devicon" },
  "azure": { label: "Microsoft Azure", file: "/logos/azure.svg", tint: "#0078D4", source: "devicon" },
  "googlecloud": { label: "Google Cloud", file: "/logos/googlecloud.svg", tint: "#4285F4", source: "devicon" },
  "linux": { label: "Linux", file: "/logos/linux.svg", tint: "#FCC624", source: "devicon" },
  "ubuntu": { label: "Ubuntu", file: "/logos/ubuntu.svg", tint: "#E95420", source: "devicon" },
  "git": { label: "Git", file: "/logos/git.svg", tint: "#F05032", source: "devicon" },
  "github": { label: "GitHub", file: "/logos/github.svg", tint: "#181717", source: "devicon" },
  "gitlab": { label: "GitLab", file: "/logos/gitlab.svg", tint: "#FC6D26", source: "devicon" },
  "jenkins": { label: "Jenkins", file: "/logos/jenkins.svg", tint: "#D24939", source: "devicon" },
  "githubactions": { label: "GitHub Actions", file: "/logos/githubactions.svg", tint: "#2088FF", source: "devicon" },
  "terraform": { label: "Terraform", file: "/logos/terraform.svg", tint: "#7B42BC", source: "devicon" },
  "ansible": { label: "Ansible", file: "/logos/ansible.svg", tint: "#EE0000", source: "devicon" },
  "prometheus": { label: "Prometheus", file: "/logos/prometheus.svg", tint: "#E6522C", source: "devicon" },
  "grafana": { label: "Grafana", file: "/logos/grafana.svg", tint: "#F46800", source: "devicon" },
  "nginx": { label: "NGINX", file: "/logos/nginx.svg", tint: "#009639", source: "devicon" },
  "python": { label: "Python", file: "/logos/python.svg", tint: "#3776AB", source: "devicon" },
  "bash": { label: "Bash", file: "/logos/bash.svg", tint: "#4EAA25", source: "devicon" },
  "go": { label: "Go", file: "/logos/go.svg", tint: "#00ADD8", source: "devicon" },
  "java": { label: "Java", file: "/logos/java.svg", tint: "#ED8B00", source: "devicon" },
  "javascript": { label: "JavaScript", file: "/logos/javascript.svg", tint: "#F7DF1E", source: "devicon" },
  "typescript": { label: "TypeScript", file: "/logos/typescript.svg", tint: "#3178C6", source: "devicon" },
  "nodejs": { label: "Node.js", file: "/logos/nodejs.svg", tint: "#5FA04E", source: "devicon" },
  "react": { label: "React", file: "/logos/react.svg", tint: "#61DAFB", source: "devicon" },
  "nextjs": { label: "Next.js", file: "/logos/nextjs.svg", tint: "#000000", source: "devicon" },
  "postgresql": { label: "PostgreSQL", file: "/logos/postgresql.svg", tint: "#4169E1", source: "devicon" },
  "mysql": { label: "MySQL", file: "/logos/mysql.svg", tint: "#4479A1", source: "devicon" },
  "mongodb": { label: "MongoDB", file: "/logos/mongodb.svg", tint: "#47A248", source: "devicon" },
  "redis": { label: "Redis", file: "/logos/redis.svg", tint: "#FF4438", source: "devicon" },
  "helm": { label: "Helm", file: "/logos/helm.svg", tint: "#0F1689", source: "devicon" },
  "argocd": { label: "Argo CD", file: "/logos/argocd.svg", tint: "#EF7B4D", source: "devicon" },
  "vagrant": { label: "Vagrant", file: "/logos/vagrant.svg", tint: "#1868F2", source: "devicon" },
  "elasticsearch": { label: "Elasticsearch", file: "/logos/elasticsearch.svg", tint: "#005571", source: "devicon" },
  "sonarqube": { label: "SonarQube", file: "/logos/sonarqube.svg", tint: "#4E9BCD", source: "devicon" },
  "maven": { label: "Maven", file: "/logos/maven.svg", tint: "#C71A36", source: "devicon" },
  "gradle": { label: "Gradle", file: "/logos/gradle.svg", tint: "#02303A", source: "devicon" },
  "yaml": { label: "YAML", file: "/logos/yaml.svg", tint: "#CB171E", source: "devicon" },
  "c": { label: "C", file: "/logos/c.svg", tint: "#A8B9CC", source: "devicon" },
  "cplusplus": { label: "C++", file: "/logos/cplusplus.svg", tint: "#00599C", source: "devicon" },
  "html5": { label: "HTML5", file: "/logos/html5.svg", tint: "#E34F26", source: "devicon" },
  "css3": { label: "CSS3", file: "/logos/css3.svg", tint: "#1572B6", source: "devicon" },
  "vscode": { label: "VS Code", file: "/logos/vscode.svg", tint: "#007ACC", source: "devicon" },
  "jira": { label: "Jira", file: "/logos/jira.svg", tint: "#0052CC", source: "devicon" },
  "apache": { label: "Apache", file: "/logos/apache.svg", tint: "#D22128", source: "devicon" },
  "tomcat": { label: "Tomcat", file: "/logos/tomcat.svg", tint: "#F8DC75", source: "devicon" },
  "redhat": { label: "Red Hat", file: "/logos/redhat.svg", tint: "#EE0000", source: "devicon" },
  "debian": { label: "Debian", file: "/logos/debian.svg", tint: "#A81D33", source: "devicon" },
  "centos": { label: "CentOS", file: "/logos/centos.svg", tint: "#262577", source: "devicon" },
  "fastapi": { label: "FastAPI", file: "/logos/fastapi.svg", tint: "#009688", source: "devicon" },
  "flask": { label: "Flask", file: "/logos/flask.svg", tint: "#000000", source: "devicon" },
  "django": { label: "Django", file: "/logos/django.svg", tint: "#092E20", source: "devicon" },
  "spring": { label: "Spring", file: "/logos/spring.svg", tint: "#6DB33F", source: "devicon" },
  "express": { label: "Express", file: "/logos/express.svg", tint: "#000000", source: "devicon" },
  "podman": { label: "Podman", file: "/logos/podman.svg", tint: "#892CA0", source: "devicon" },
  "openstack": { label: "OpenStack", file: "/logos/openstack.svg", tint: "#ED1944", source: "devicon" },
  "digitalocean": { label: "DigitalOcean", file: "/logos/digitalocean.svg", tint: "#0080FF", source: "devicon" },
  "heroku": { label: "Heroku", file: "/logos/heroku.svg", tint: "#430098", source: "devicon" },
  "vercel": { label: "Vercel", file: "/logos/vercel.svg", tint: "#000000", source: "devicon" },
  "netlify": { label: "Netlify", file: "/logos/netlify.svg", tint: "#00C7B7", source: "devicon" },
  "cloudflare": { label: "Cloudflare", file: "/logos/cloudflare.svg", tint: "#F38020", source: "devicon" },
  "grpc": { label: "gRPC", file: "/logos/grpc.svg", tint: "#244C5A", source: "devicon" },
  "kafka": { label: "Apache Kafka", file: "/logos/kafka.svg", tint: "#231F20", source: "devicon" },
  "rabbitmq": { label: "RabbitMQ", file: "/logos/rabbitmq.svg", tint: "#FF6600", source: "devicon" },
  "groovy": { label: "Groovy", file: "/logos/groovy.svg", tint: "#4298B8", source: "devicon" },
  "powershell": { label: "PowerShell", file: "/logos/powershell.svg", tint: "#5391FE", source: "devicon" },
  "leetcode": { label: "LeetCode", file: "/logos/si-leetcode.svg", tint: "#FFA116", source: "simple-icons" },
  "codechef": { label: "CodeChef", file: "/logos/si-codechef.svg", tint: "#5B4638", source: "simple-icons" },
  "hackerrank": { label: "HackerRank", file: "/logos/si-hackerrank.svg", tint: "#00EA64", source: "simple-icons" },
  "geeksforgeeks": { label: "GeeksforGeeks", file: "/logos/si-geeksforgeeks.svg", tint: "#2F8D46", source: "simple-icons" },
  "codeforces": { label: "Codeforces", file: "/logos/si-codeforces.svg", tint: "#1F8ACB", source: "simple-icons" },
  "kaggle": { label: "Kaggle", file: "/logos/si-kaggle.svg", tint: "#20BEFF", source: "simple-icons" },
  "hackerearth": { label: "HackerEarth", file: "/logos/si-hackerearth.svg", tint: "#2C3454", source: "simple-icons" },
  "topcoder": { label: "Topcoder", file: "/logos/si-topcoder.svg", tint: "#29A7DF", source: "simple-icons" },
  "codingninjas": { label: "Coding Ninjas", file: "/logos/si-codingninjas.svg", tint: "#DD6620", source: "simple-icons" },
  "coursera": { label: "Coursera", file: "/logos/si-coursera.svg", tint: "#0056D2", source: "simple-icons" },
  "udemy": { label: "Udemy", file: "/logos/si-udemy.svg", tint: "#A435F0", source: "simple-icons" },
  "credly": { label: "Credly", file: "/logos/si-credly.svg", tint: "#FF6B00", source: "simple-icons" },
  "azuredevops": { label: "Azure DevOps", file: "/logos/azuredevops.svg", tint: "#0078D7", source: "devicon" },
  "bitbucket": { label: "Bitbucket", file: "/logos/bitbucket.svg", tint: "#0052CC", source: "devicon" },
  "subversion": { label: "Subversion", file: "/logos/subversion.svg", tint: "#809CC9", source: "devicon" },
  "vault": { label: "HashiCorp Vault", file: "/logos/vault.svg", tint: "#FFD814", source: "devicon" },
  "opentelemetry": { label: "OpenTelemetry", file: "/logos/opentelemetry.svg", tint: "#F5A800", source: "devicon" },
  "datadog": { label: "Datadog", file: "/logos/datadog.svg", tint: "#632CA6", source: "devicon" },
  "dynatrace": { label: "Dynatrace", file: "/logos/dynatrace.svg", tint: "#1496FF", source: "devicon" },
  "newrelic": { label: "New Relic", file: "/logos/newrelic.svg", tint: "#1CE783", source: "devicon" },
  "logstash": { label: "Logstash", file: "/logos/logstash.svg", tint: "#005571", source: "devicon" },
  "kibana": { label: "Kibana", file: "/logos/kibana.svg", tint: "#005571", source: "devicon" },
  "windows": { label: "Windows", file: "/logos/windows11.svg", tint: "#0078D4", source: "devicon" },
  "jfrog": { label: "JFrog", file: "/logos/si-jfrog.svg", tint: "#40BE46", source: "simple-icons" },
  "sumologic": { label: "Sumo Logic", file: "/logos/si-sumologic.svg", tint: "#000099", source: "simple-icons" },
  "githubcopilot": { label: "GitHub Copilot", file: "/logos/si-githubcopilot.svg", tint: "#6e6e6e", source: "simple-icons" },
  "mcp": { label: "Model Context Protocol", file: "/logos/si-modelcontextprotocol.svg", tint: "#6e6e6e", source: "simple-icons" },
  "openshift": { label: "Red Hat OpenShift", file: "/logos/si-redhatopenshift.svg", tint: "#EE0000", source: "simple-icons" },
  "puppet": { label: "Puppet", file: "/logos/si-puppet.svg", tint: "#FFAE1A", source: "simple-icons" },
};

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** 24×24 thin line icons for concepts. */
export const CONCEPT: Record<string, { label: string; icon: ReactNode }> = {
  cicd: { label: "CI/CD", icon: <g {...S}><path d="M4 12a5 5 0 0 1 8.5-3.5L15 11M20 12a5 5 0 0 1-8.5 3.5L9 13" /><path d="M15 7v4h-4M9 17v-4h4" /></g> },
  iac: { label: "Infrastructure as Code", icon: <g {...S}><path d="M8 7 3 12l5 5M16 7l5 5-5 5" /><rect x="10" y="9" width="4" height="6" rx="1" /></g> },
  gitops: { label: "GitOps", icon: <g {...S}><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 8v8M8 6h4a4 4 0 0 1 4 4v0M8 18h4a4 4 0 0 0 4-4" /></g> },
  devsecops: { label: "DevSecOps", icon: <g {...S}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></g> },
  security: { label: "Security", icon: <g {...S}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></g> },
  deploy: { label: "Deployment strategies", icon: <g {...S}><rect x="3" y="5" width="7" height="14" rx="1.5" /><rect x="14" y="5" width="7" height="14" rx="1.5" /><path d="M10 12h4M12.5 10.5 14 12l-1.5 1.5" /></g> },
  rollback: { label: "Rollback", icon: <g {...S}><path d="M9 7 4 12l5 5" /><path d="M4 12h10a5 5 0 0 1 0 10h-3" /></g> },
  monitoring: { label: "Monitoring", icon: <g {...S}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="m6 13 3-3 3 2 5-5M8 21h8M12 17v4" /></g> },
  logging: { label: "Logging", icon: <g {...S}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 11h7M9 14h7M9 17h4" /></g> },
  cloud: { label: "Cloud", icon: <g {...S}><path d="M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.4 1.5A3.5 3.5 0 0 1 17.5 18Z" /></g> },
  multicloud: { label: "Multi-cloud", icon: <g {...S}><path d="M5 13a3 3 0 0 1 .4-6 4.5 4.5 0 0 1 8.4 1" /><path d="M10 20a3 3 0 0 1-.4-6 4.5 4.5 0 0 1 8.6 1.2A2.6 2.6 0 0 1 18 20Z" /></g> },
  serverless: { label: "Serverless", icon: <g {...S}><path d="M13 3 5 14h6l-1 7 8-11h-6z" /></g> },
  microservices: { label: "Microservices", icon: <g {...S}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></g> },
  eventdriven: { label: "Event-driven", icon: <g {...S}><circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 12h5M12 12l5-5M12 12l5 5" /></g> },
  containers: { label: "Containers", icon: <g {...S}><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="m4 7 8 4 8-4M12 11v10" /></g> },
  orchestration: { label: "Orchestration", icon: <g {...S}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 4v5M12 15v5M4 12h5M15 12h5" /></g> },
  network: { label: "Networking", icon: <g {...S}><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v5M12 12 6.5 17.5M12 12l5.5 5.5" /></g> },
  identity: { label: "Identity & access", icon: <g {...S}><circle cx="9" cy="9" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M15 11h6M18 8v6" /></g> },
  secrets: { label: "Secrets", icon: <g {...S}><circle cx="8" cy="14" r="4" /><path d="m11 11 8-8M16 6l2 2M14 8l2 2" /></g> },
  storage: { label: "Storage", icon: <g {...S}><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></g> },
  compute: { label: "Compute", icon: <g {...S}><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></g> },
  server: { label: "Servers", icon: <g {...S}><rect x="4" y="4" width="16" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" /><path d="M8 7.5h.01M8 16.5h.01" /></g> },
  scripting: { label: "Scripting", icon: <g {...S}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 10 3 2-3 2M12 15h5" /></g> },
  ai: { label: "AI", icon: <g {...S}><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><rect x="7" y="7" width="10" height="10" rx="2.5" /><path d="m10 14 1.2-4h1.6l1.2 4M10.5 12.5h3" /></g> },
  itsm: { label: "ITSM", icon: <g {...S}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></g> },
  incident: { label: "Incident management", icon: <g {...S}><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17h.01" /></g> },
  rca: { label: "RCA", icon: <g {...S}><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5M10.5 8v3l2 1.5" /></g> },
  os: { label: "Operating systems", icon: <g {...S}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></g> },
  build: { label: "Build tooling", icon: <g {...S}><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5L15 12l-3-3z" /></g> },
  registry: { label: "Artifact registry", icon: <g {...S}><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M8 9.5v5M12 11v6M16 9.5v5" /></g> },
  generic: { label: "Skill", icon: <g {...S}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></g> },
};

export function isBrand(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(BRAND, key);
}

export function isConcept(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONCEPT, key);
}

/** Tint colour for the soft glow (brand only; concepts stay gray). */
export function logoTint(key: string): string | null {
  return isBrand(key) ? BRAND[key].tint : null;
}

type Props = {
  name: string;
  size?: number;
  /** Show a soft brand-tint glow behind the logo. */
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Renders a brand SVG (as <img>) or a concept line icon. Decorative by default. */
export default function TechLogo({ name, size = 24, glow = false, className = "", style }: Props) {
  const box: CSSProperties = { width: size, height: size, position: "relative", flex: "none", ...style };
  if (isBrand(name)) {
    const b = BRAND[name];
    return (
      <span className={`tl ${className}`} style={box} aria-hidden="true">
        {glow ? (
          <span
            style={{
              position: "absolute",
              inset: "-35%",
              borderRadius: "50%",
              background: `radial-gradient(closest-side, ${b.tint}33, transparent)`,
              filter: "blur(8px)",
            }}
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(b.file)} alt="" width={size} height={size} loading="lazy" decoding="async"
          style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain" }} />
      </span>
    );
  }
  const c = CONCEPT[name] ?? CONCEPT.generic;
  return (
    <span className={`tl ${className}`} style={{ ...box, color: "var(--ink-2)" }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size}>{c.icon}</svg>
    </span>
  );
}
