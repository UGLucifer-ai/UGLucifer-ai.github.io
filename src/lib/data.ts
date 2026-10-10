/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF CONTENT
 *  Every string on the site comes from this file, and every value here must be
 *  traceable to the résumé PDF (incl. its embedded hyperlinks). Never invent.
 *
 *  STATUS: filled from inputs/resume.pdf (5 pages, exported 2026-09-17).
 *  The résumé has NO GitHub link, projects, certifications, education or
 *  achievements — those arrays are empty, so their sections and nav links are
 *  removed automatically. Values still pending are marked `TODO(...)`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ───────────────────────────── Types ───────────────────────────── */

export type Link = { label: string; href: string };

export type Profile = {
  /** Full name exactly as on the résumé. */
  name: string;
  /** Used for the giant ghost word in the hero (uppercased at render time). */
  firstName: string;
  /** 1–3 letters for the round nav mark. */
  initials: string;
  /** Hero heading — role exactly as on the résumé (e.g. "DevOps Engineer"). */
  role: string;
  email: string;
  /** Display form, e.g. "+91 98xxx xxxxx". */
  phone: string;
  /** tel: href form, e.g. "tel:+9198xxxxxxxx". */
  phoneHref: string;
  location: string;
  /** Résumé summary / objective, VERBATIM. */
  resumeSummary: string;
  /** One more short line lifted from the résumé (About, left column). */
  aboutExtraLine: string;
  /** Paraphrase of the résumé's own wording (About, right column). */
  quote: string;
  github: string;
  linkedin: string;
  /** Public path of the résumé PDF (copy the file to /public/resume.pdf). */
  resume: string;
  /** Public path of the 480×600 portrait (built by scripts/build-hero-assets.py). */
  portrait: string;
  /** Canonical site URL (used for OG metadata). Empty until deployed. */
  siteUrl: string;
};

export type HeroMedia = {
  /** Flip to true once public/hero/hero.{webm,mp4} exist. */
  enabled: boolean;
  webm: string;
  mp4: string;
  poster?: string;
};

export type QuickFact = { label: string; value: string; href?: string };

export type IdCard = {
  /** Row values — each row only renders if its value is non-empty. */
  idNo: string;
  dept: string;
  /** Graduation year from the résumé. */
  validTill: string;
  /** "What I am" — 4–5 lines drawn only from the résumé. */
  backLines: string[];
};

export type NavItem = {
  id: SectionId;
  label: string;
};

export type SectionId =
  | "about"
  | "skills"
  | "work"
  | "certifications"
  | "experience"
  | "achievements"
  | "contact";

export type Skill = {
  name: string;
  /** 2-letter element symbol, e.g. "Dk" for Docker. */
  symbol: string;
  /** Key into TechLogo BRAND or CONCEPT map (see components/ui/TechLogo.tsx). */
  logo: string;
};

export type SkillGroup = {
  /** Family label, e.g. "Cloud", "Containers", "CI/CD", "IaC", "Languages". */
  family: string;
  skills: Skill[];
};

export type TimelineBase = {
  id: string;
  /** Sort key for chronological order (e.g. start year, or 2024.06). */
  sort: number;
  /** Display label, e.g. "2022 — 2026" or "Jun 2025 — Present". */
  period: string;
};

export type ExperienceItem = TimelineBase & {
  kind: "experience";
  title: string;
  org: string;
  place: string;
  detail: string;
  points: string[];
  /** "Environment:" line from the résumé. */
  stack: string[];
};

export type EducationItem = TimelineBase & {
  kind: "education";
  /** e.g. "B.Tech, Computer Science" / "Intermediate (MPC)" / "SSC". */
  title: string;
  school: string;
  place: string;
  /** e.g. "CGPA 8.9" / "96.4%" — only if stated. */
  score: string;
  honours: string;
};

export type ProjectMock =
  | "pipeline"
  | "terminal"
  | "dashboard"
  | "cluster"
  | "chat"
  | "generic";

export type Project = {
  id: string;
  /** "01", "02", … */
  index: string;
  title: string;
  /** Short kicker above the title, e.g. "CI/CD · AWS". */
  kicker: string;
  description: string;
  features: string[];
  /** Skill names (should match Skill.name so the inspector can cross-link). */
  tech: string[];
  github: string;
  live: string;
  /** Which illustrative grayscale mini-UI to draw. */
  mock: ProjectMock;
};

export type Certification = {
  title: string;
  issuer: string;
  year: string;
  /** Certificate URL embedded in the résumé (optional). */
  href: string;
};

export type Achievement = {
  id: string;
  /** TechLogo key, e.g. "leetcode", "hackerrank", "codechef". */
  logo: string;
  label: string;
  caption: string;
  detail: string;
  /** Number that counts up. */
  value: number;
  prefix?: string;
  suffix?: string;
};

/* ───────────────────────────── Content ───────────────────────────── */

export const PROFILE: Profile = {
  // Résumé header reads "Uday Charan"; display name confirmed by Uday as "Uday Charan Gopi".
  name: "Uday Charan Gopi",
  firstName: "Uday",
  initials: "UC",
  role: "Sr. DevOps Engineer",
  email: "gopiudaycharan8@gmail.com",
  phone: "864-285-7706",
  phoneHref: "tel:8642857706",
  location: "", // not stated in the résumé
  // Professional Summary, bullet 1 — verbatim.
  resumeSummary:
    "Senior DevOps and Cloud Engineer with extensive experience architecting, automating, and operating secure, scalable enterprise infrastructure across AWS, Azure, GCP, and on-premises environments.",
  // Professional Summary, last bullet — verbatim.
  aboutExtraLine:
    "Proven ability to evaluate emerging cloud, Kubernetes, automation, and AI technologies through POCs and introduce solutions that improve scalability, reliability, security, and engineering productivity.",
  // Paraphrase of the summary's own wording ("architecting, automating, and operating secure, scalable … infrastructure").
  quote: "Architect it, automate it, operate it — secure and scalable, from AWS to on-prem.",
  github: "", // not in the résumé
  linkedin: "https://www.linkedin.com/in/udayg08/", // embedded hyperlink in the résumé
  resume: "/resume.pdf",
  portrait: "/portrait-bust.webp",
  siteUrl: "https://uglucifer-ai.github.io", // GitHub Pages user site (served at the root)
};

/** All Professional Summary bullets, verbatim (bullet artefacts stripped). */
export const SUMMARY_POINTS: string[] = [
  "Senior DevOps and Cloud Engineer with extensive experience architecting, automating, and operating secure, scalable enterprise infrastructure across AWS, Azure, GCP, and on-premises environments.",
  "Strong expertise in Kubernetes, Amazon EKS, OpenShift, Docker, Helm, Argo CD, and GitOps, with hands-on experience in cluster management, upgrades, node pools, autoscaling, namespaces, and production workload troubleshooting.",
  "Extensive experience with IaC and configuration automation using Terraform, Terragrunt, CloudFormation, Ansible, and scripting with Python, Bash, PowerShell, and Groovy.",
  "Designed and maintained enterprise CI/CD pipelines using Jenkins, GitLab CI, AWS CodePipeline, Git, and GitHub, integrating automated build, testing, deployment, and rollback processes.",
  "Implemented DevSecOps practices by integrating SonarQube, Fortify, Black Duck, Sysdig, Veracode, HashiCorp Vault, RBAC, Kyverno, WAF, network policies, and container security controls into delivery workflows.",
  "Hands-on experience with AWS services including EC2, S3, IAM, VPC, ELB, Auto Scaling, Route 53, CloudFront, CloudWatch, and EKS, along with experience supporting Azure and GCP cloud environments.",
  "Implemented advanced deployment strategies including blue-green, canary, zero-downtime deployments, automated rollback, Helm-based releases, and Argo Rollouts for highly available production applications.",
  "Built and supported enterprise observability solutions using Prometheus, Grafana, ELK/EFK, OpenTelemetry, Datadog, Dynatrace, and CloudWatch for infrastructure, application, and Kubernetes monitoring.",
  "Experienced in designing secure cloud and Kubernetes environments using IAM, secrets management, zero-trust principles, network security, and compliance-focused controls.",
  "Leveraged Generative AI and AI-assisted engineering tools including GitHub Copilot, Amazon CodeWhisperer, ChatGPT, and MCP workflows to accelerate infrastructure automation, scripting, troubleshooting, and operational efficiency.",
  "Strong production support experience handling P1/P2 incidents, change management, hotfix deployments, root-cause troubleshooting, SLA adherence, and ServiceNow/JIRA-based operational processes.",
  "Proven ability to evaluate emerging cloud, Kubernetes, automation, and AI technologies through POCs and introduce solutions that improve scalability, reliability, security, and engineering productivity.",
];

export const HERO: HeroMedia = {
  enabled: true, // built from inputs/intro.mp4 by scripts/build-hero-assets.py
  webm: "/hero/hero.webm",
  mp4: "/hero/hero.mp4",
  poster: "/hero/hero-poster.webp", // frame 0 of hero.mp4 (build-hero-assets.py), so playback starts without a jump
};

/**
 * Optional silent idle loop shown (muted, looping) after an answer ends — he waits without talking.
 * Build it with `scripts/build-hero-assets.py --idle inputs/idle.mp4` (→ public/hero/idle.{webm,mp4} +
 * idle-poster.webp, no audio track), then set enabled: true. While disabled (or if it fails to load) the
 * character holds still on the answer's last frame instead.
 */
export const HERO_IDLE: {
  enabled: boolean;
  webm: string;
  mp4: string;
  poster: string;
  /**
   * Optional idle variation: a silent ~8 s clip where he steps through a soft white door behind him and comes back
   * to the starting pose. Played once every ~3–4 idle loops (randomised), then back to the idle loop. Needs the idle
   * loop. Build: `scripts/build-hero-assets.py --idle-door inputs/idle-door.mp4` (→ public/hero/idle-door.*).
   */
  door: { enabled: boolean; webm: string; mp4: string; poster: string };
} = {
  enabled: true, // inputs/idle.mp4 (Flow idleA), mouth-still 3.542–7.792 s, 0.5 s xfade loop (3.71 s), no audio track
  webm: "/hero/idle.webm",
  mp4: "/hero/idle.mp4",
  poster: "/hero/idle-poster.webp",
  door: {
    enabled: true, // inputs/idle-door.mp4 (Flow idleB), trimmed 0.29–8.67 s, --whiten-max 0.80 (clears the door set's wall/floor shading), no audio track
    webm: "/hero/idle-door.webm",
    mp4: "/hero/idle-door.mp4",
    poster: "/hero/idle-door-poster.webp",
  },
};

/** Suggested "Ask me" chips that can have a lip-synced answer clip. */
export type AnswerClipId = "who" | "whatdo" | "current" | "kubernetes" | "aws" | "cicd" | "tools" | "contact" | "resume";
export type AnswerClip = { webm: string; mp4: string; poster: string; speech?: [number, number] };

/**
 * Answer-clip manifest. Add a chip id here once `scripts/build-hero-assets.py --answer <id> inputs/answers/<id>.mp4`
 * has written public/hero/answers/<id>.{webm,mp4} + <id>-poster.webp (same crop/box as the hero loop).
 * Chips not listed here, or whose files fail to load, answer text-only. Scripts: clips/ANSWER-CLIPS.md.
 */
export const ANSWER_CLIP_IDS: AnswerClipId[] = [
  "who",
  "whatdo",
  "current",
  "kubernetes",
  "aws",
  "cicd",
  "tools",
  "resume",
  "contact",
];

/**
 * Where the words sit inside a clip (seconds), for caption pacing — only for clips whose silence around the
 * speech isn't the default 0.2 s (build-hero-assets.py --answer prints the values when needed).
 */
export const ANSWER_CLIP_SPEECH: Partial<Record<AnswerClipId, [number, number]>> = {
  resume: [0.24, 3.29], // kept a 1.8 s silent tail so he ends with his hands back in his pockets
  contact: [0.22, 5.86], // 0.75 s tail, same reason
};

export function answerClip(id: string): AnswerClip | null {
  if (!HERO.enabled || !(ANSWER_CLIP_IDS as string[]).includes(id)) return null;
  return {
    webm: `/hero/answers/${id}.webm`,
    mp4: `/hero/answers/${id}.mp4`,
    poster: `/hero/answers/${id}-poster.webp`,
    speech: ANSWER_CLIP_SPEECH[id as AnswerClipId],
  };
}

export const QUICK_FACTS: QuickFact[] = [
  { label: "Role", value: "Sr. DevOps Engineer" },
  { label: "Currently", value: "JPMC, Remote · May 2025 – Till Date" },
  { label: "Clouds", value: "AWS · Microsoft Azure · GCP · OpenStack" },
  { label: "Email", value: "gopiudaycharan8@gmail.com", href: "mailto:gopiudaycharan8@gmail.com" },
];

export const ID_CARD: IdCard = {
  idNo: "", // not in the résumé — row hidden
  dept: "DevOps and Cloud", // summary: "Senior DevOps and Cloud Engineer"
  validTill: "", // no education/graduation year in the résumé — row hidden
  backLines: [
    "Sr. DevOps Engineer",
    "AWS · Azure · GCP · on-premises",
    "Kubernetes · EKS · OpenShift · Helm · Argo CD",
    "Terraform · Terragrunt · CloudFormation · Ansible",
    "JPMC · CVS · Optum Health · Lincoln Financial Group",
  ],
};

/** Full nav in spec order. Filtered at runtime by `visibleNav()`. */
export const NAV: NavItem[] = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "achievements", label: "Achievements" },
  { id: "contact", label: "Contact" },
];

/* Element-tile helper: symbol is given explicitly so tiles stay stable. */
const sk = (name: string, symbol: string, logo: string): Skill => ({ name, symbol, logo });

/** Every skill from the résumé's "Technical Skills" table, grouped by its own categories. */
export const SKILL_GROUPS: SkillGroup[] = [
  {
    family: "Cloud",
    skills: [
      sk("AWS", "Aw", "aws"),
      sk("Microsoft Azure", "Az", "azure"),
      sk("Google Cloud Platform (GCP)", "Gc", "googlecloud"),
      sk("OpenStack", "Os", "openstack"),
    ],
  },
  {
    family: "AWS Services",
    skills: [
      sk("EC2", "Ec", "aws"),
      sk("EKS", "Ek", "aws"),
      sk("ECS", "Es", "aws"),
      sk("S3", "S3", "aws"),
      sk("RDS", "Rd", "aws"),
      sk("VPC", "Vp", "aws"),
      sk("IAM", "Ia", "aws"),
      sk("Route 53", "R5", "aws"),
      sk("ELB/ALB", "Lb", "aws"),
      sk("Auto Scaling", "As", "aws"),
      sk("CloudFront", "Cf", "aws"),
      sk("CloudWatch", "Cw", "aws"),
      sk("CloudTrail", "Ct", "aws"),
      sk("AWS Config", "Ac", "aws"),
      sk("AWS KMS", "Km", "aws"),
      sk("Secrets Manager", "Sm", "aws"),
      sk("Lambda", "La", "aws"),
      sk("Step Functions", "Sf", "aws"),
    ],
  },
  {
    family: "Azure Services",
    skills: [
      sk("AKS", "Ak", "azure"),
      sk("ACR", "Ar", "azure"),
      sk("Azure DevOps", "Ad", "azuredevops"),
      sk("Virtual Networks", "Vn", "azure"),
      sk("Virtual Machines", "Vm", "azure"),
      sk("Storage", "St", "azure"),
      sk("Load Balancers", "Ln", "azure"),
    ],
  },
  {
    family: "GCP Services",
    skills: [
      sk("Cloud Storage", "Cs", "googlecloud"),
      sk("Cloud Functions", "Fn", "googlecloud"),
      sk("Pub/Sub", "Ps", "googlecloud"),
      sk("Memorystore", "Me", "googlecloud"),
      sk("Cloud Run", "Cr", "googlecloud"),
      sk("OCR Services", "Oc", "googlecloud"),
    ],
  },
  {
    family: "Containers & Orchestration",
    skills: [
      sk("Kubernetes", "K8", "kubernetes"),
      sk("Amazon EKS", "Ae", "kubernetes"),
      sk("Azure AKS", "Aa", "kubernetes"),
      sk("OpenShift", "Op", "openshift"),
      sk("Docker", "Dk", "docker"),
      sk("Helm", "He", "helm"),
      sk("Argo CD", "Ag", "argocd"),
      sk("Argo Rollouts", "Ro", "argocd"),
      sk("Kubernetes RBAC", "Kr", "kubernetes"),
      sk("Ingress", "In", "kubernetes"),
      sk("ConfigMaps", "Cm", "kubernetes"),
      sk("Secrets", "Se", "kubernetes"),
      sk("StatefulSets", "Ss", "kubernetes"),
      sk("GitOps", "Go", "gitops"),
    ],
  },
  {
    family: "IaC & Config Mgmt",
    skills: [
      sk("Terraform", "Tf", "terraform"),
      sk("Terragrunt", "Tg", "iac"),
      sk("AWS CloudFormation", "Cl", "aws"),
      sk("Ansible", "An", "ansible"),
    ],
  },
  {
    family: "CI/CD & Build",
    skills: [
      sk("Jenkins", "Je", "jenkins"),
      sk("GitLab CI", "Gl", "gitlab"),
      sk("GitHub Actions", "Gh", "githubactions"),
      sk("AWS CodePipeline", "Cp", "aws"),
      sk("Maven", "Mv", "maven"),
      sk("JFrog Artifactory", "Jf", "jfrog"),
    ],
  },
  {
    family: "Source Control",
    skills: [
      sk("Git", "Gi", "git"),
      sk("GitHub", "Hb", "github"),
      sk("GitLab", "Lg", "gitlab"),
      sk("Bitbucket", "Bb", "bitbucket"),
      sk("Subversion", "Sv", "subversion"),
    ],
  },
  {
    family: "DevSecOps & Security",
    skills: [
      sk("SonarQube", "Sq", "sonarqube"),
      sk("Fortify", "Fo", "devsecops"),
      sk("Black Duck", "Bd", "devsecops"),
      sk("Sysdig", "Sy", "devsecops"),
      sk("Veracode", "Vc", "devsecops"),
      sk("42Crunch", "42", "devsecops"),
      sk("HashiCorp Vault", "Hv", "vault"),
      sk("Kyverno", "Ky", "security"),
      sk("RBAC", "Rb", "identity"),
      sk("WAF", "Wf", "security"),
      sk("TLS", "Tl", "security"),
      sk("Network Policies", "Np", "network"),
      sk("Secrets Management", "Sx", "secrets"),
    ],
  },
  {
    family: "Observability",
    skills: [
      sk("Prometheus", "Pr", "prometheus"),
      sk("Grafana", "Gr", "grafana"),
      sk("ELK/EFK", "El", "elasticsearch"),
      sk("OpenTelemetry", "Ot", "opentelemetry"),
      sk("Datadog", "Dd", "datadog"),
      sk("Dynatrace", "Dy", "dynatrace"),
      sk("New Relic", "Nr", "newrelic"),
      sk("Sumo Logic", "Su", "sumologic"),
      sk("Kibana", "Kb", "kibana"),
      sk("Logstash", "Lo", "logstash"),
      sk("Zabbix", "Zb", "monitoring"),
    ],
  },
  {
    family: "Scripting",
    skills: [
      sk("Python", "Py", "python"),
      sk("Bash/Shell", "Sh", "bash"),
      sk("PowerShell", "Pw", "powershell"),
      sk("Groovy", "Gv", "groovy"),
      sk("YAML", "Ym", "yaml"),
      sk("Boto3", "B3", "python"),
    ],
  },
  {
    family: "OS & Servers",
    skills: [
      sk("Linux", "Li", "linux"),
      sk("Windows", "Wi", "windows"),
      sk("Apache", "Ap", "apache"),
      sk("Nginx", "Nx", "nginx"),
      sk("Tomcat", "Tc", "tomcat"),
      sk("WebSphere", "Ws", "server"),
      sk("WebLogic", "Wl", "server"),
    ],
  },
  {
    family: "AI / GenAI",
    skills: [
      sk("GitHub Copilot", "Co", "githubcopilot"),
      sk("Amazon CodeWhisperer", "Cd", "aws"),
      sk("ChatGPT", "Ch", "ai"),
      sk("MCP", "Mc", "mcp"),
      sk("GenAI Platform Support", "Ga", "ai"),
    ],
  },
  {
    family: "DevOps Practices",
    skills: [
      sk("CI/CD", "Ci", "cicd"),
      sk("Infrastructure as Code (IaC)", "Ic", "iac"),
      sk("DevSecOps", "Ds", "devsecops"),
      sk("Blue-Green Deployment", "Bg", "deploy"),
      sk("Canary Deployment", "Ca", "deploy"),
      sk("Rolling Deployment", "Rl", "deploy"),
      sk("Zero-Downtime Deployment", "Zd", "deploy"),
      sk("Automated Rollback", "Rk", "rollback"),
    ],
  },
  {
    family: "ITSM",
    skills: [
      sk("ServiceNow", "Sn", "itsm"),
      sk("JIRA", "Ji", "jira"),
      sk("Incident Management", "Im", "incident"),
      sk("Problem Management", "Pm", "incident"),
      sk("Change Management", "Cg", "itsm"),
      sk("RCA", "Rc", "rca"),
      sk("SLA", "Sl", "itsm"),
    ],
  },
  {
    family: "Architecture",
    skills: [
      sk("Microservices", "Mi", "microservices"),
      sk("Serverless Architecture", "Sa", "serverless"),
      sk("Event-Driven Architecture", "Ev", "eventdriven"),
      sk("Multi-Cloud", "Mu", "multicloud"),
      sk("Hybrid Cloud", "Hy", "cloud"),
      sk("Containerized Platforms", "Cn", "containers"),
    ],
  },
];

export const EXPERIENCE: ExperienceItem[] = [
  {
    kind: "experience",
    id: "jpmc",
    sort: 2025.05,
    period: "May 2025 – Till Date",
    title: "Sr. DevOps Engineer",
    org: "JPMC",
    place: "Remote",
    detail:
      "Designed and implemented secure, highly available cloud infrastructure for enterprise banking and financial applications across AWS and Azure environments using Terraform and Infrastructure as Code [IaC] practices.",
    points: [
      "Built and managed Kubernetes platforms using Amazon EKS and AKS, supporting application deployments, scaling, cluster upgrades, pod troubleshooting, resource management, and production availability.",
      "Implemented GitOps-based Kubernetes deployments using Argo CD and Helm, improving deployment consistency, traceability, configuration control, and rollback capabilities for financial applications.",
      "Implemented blue-green, canary, rolling, and zero/minimal-downtime deployment strategies to reduce application disruption during critical banking production releases.",
    ],
    stack: ["AWS", "Azure", "EKS", "AKS", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "Argo CD", "Helm", "Docker", "Kubernetes", "Prometheus", "Grafana", "SonarQube", "Sysdig", "Fortify", "Black Duck", "ServiceNow"],
  },
  {
    kind: "experience",
    id: "cvs",
    sort: 2024.02,
    period: "Feb 2024 - Apr 2025",
    title: "Sr. DevOps Engineer",
    org: "CVS",
    place: "Remote",
    detail:
      "Designed, implemented, and supported secure, scalable cloud platforms for healthcare and clinical-trial applications across AWS and Azure environments, focusing on availability, automation, and consistent infrastructure delivery.",
    points: [
      "Engineered automated AWS account and environment provisioning workflows using Terraform, AWS Step Functions, Lambda, and Python/Boto3, reducing manual infrastructure setup and improving platform scalability.",
      "Implemented Argo CD and GitOps-based deployment practices for Kubernetes workloads, providing controlled, version-based, traceable, and repeatable application releases across healthcare environments.",
      "Identified cloud optimization opportunities through resource utilization, storage, snapshot, capacity, and configuration reviews, improving infrastructure efficiency and controlling AWS operational costs.",
    ],
    stack: ["AWS", "Azure", "Amazon EKS", "AWS Lambda", "Step Functions", "Kubernetes", "Docker", "Helm", "Argo CD", "Terraform", "Ansible", "GitHub Actions", "Jenkins", "GitLab CI", "Python", "Boto3", "Prometheus", "Grafana", "New Relic"],
  },
  {
    kind: "experience",
    id: "optum",
    sort: 2022.08,
    period: "Aug 2022 – Jan 2024",
    title: "DevOps Engineer",
    org: "Optum Health",
    place: "CA",
    detail:
      "Designed, implemented, and supported cloud-native DevOps platforms across AWS, GCP, and Azure, enabling scalable application, data-processing, and AI-driven workloads across multiple environments.",
    points: [
      "Built and managed event-driven healthcare data-processing pipelines on GCP, automating document ingestion, preprocessing, OCR, entity extraction, and comparison workflows against EMR datasets.",
      "Managed Docker image repositories using JFrog Artifactory and integrated Sysdig container-image scanning into delivery pipelines to identify security vulnerabilities before deployment.",
      "Conducted cost, operational, performance, and quality assessments for GCP-to-Azure migration, developing benchmark reports to support cloud-platform migration decisions.",
    ],
    stack: ["AWS", "GCP", "Azure", "Amazon EKS", "ECS", "Cloud Functions", "Pub/Sub", "Memorystore", "Cloud Run", "Terraform", "Kubernetes", "Docker", "Helm", "Jenkins", "JFrog Artifactory", "Sysdig", "SonarQube", "42Crunch", "ELK"],
  },
  {
    kind: "experience",
    id: "lincoln",
    sort: 2020.07,
    period: "Jul 2020 – Dec 2022",
    title: "DevOps Engineer / Cloud DevOps Engineer",
    org: "Lincoln Financial Group",
    place: "Philadelphia, PA",
    detail:
      "Worked on designing and deploying a multitude application utilizing almost all the main services of the AWS stack (like EC2, S3, RDS, VPC, IAM, ELB, Cloud watch, Route 53, Lambda and Cloud Formation) focused on high availability, fault tolerance environment.",
    points: [
      "Created Cloud Formation Template for main services like EC2, VPC and S3 for reuse the current environment. Created network architecture on AWS VPC, subnets, Internet Gateway, Route Table and NAT Setup.",
      "Involved in Setting up Continuous Integration Environment using Jenkins and responsible for design and maintenance of the GIT Repositories, views, and the access control strategies.",
      "Developed a Python Scripts to manage few services on AWS using SDK BOTO.",
    ],
    stack: ["Jenkins", "Maven", "Hudson", "Ant", "Puppet", "Tomcat", "EC2", "VPC", "S3", "IAM", "ELB", "Auto Scaling", "CloudWatch", "Python script", "Shell script", "GIT", "GitHub", "Nagios", "Linux servers"],
  },
  {
    kind: "experience",
    id: "techm",
    sort: 2018.11,
    period: "Nov 2018 – Jun 2020",
    title: "Infrastructure & DevOps Engineer — Private Cloud",
    org: "Tech Mahindra",
    place: "India",
    detail: "Supported enterprise cloud and container platforms across development, test and production environments.",
    points: [
      "Created Helm charts and Kubernetes manifests for repeatable application deployments.",
      "Supported OpenStack-based private cloud environments including compute, networking and storage services.",
      "Implemented monitoring using Prometheus, Grafana, Zabbix and ELK.",
    ],
    stack: [],
  },
  {
    kind: "experience",
    id: "innominds",
    sort: 2017.07,
    period: "July 2017 – Oct 2018",
    title: "Build Engineer",
    org: "Innominds Software",
    place: "India",
    detail:
      "Build Pipeline design and optimization: GIT, Subversion, Maven, Jenkins and artifactory for J2EE application deployments.",
    points: [
      "Configured Ansible modules for infrastructure automation. Worked with Ansible playbooks for virtual and physical instance provisioning.",
      "Worked in all areas of Jenkins setting up CI for new branches, Build Automation, Plugin Management and Securing Jenkins and setting up master/slave configurations.",
      "Worked on CrashLoopBackoff debug, troubleshooting Kubernetes Pod logs and debugging pod restart and resolving all pod issues in production.",
    ],
    stack: ["Tomcat", "WebSphere", "Blackduck", "Sumologic", "Sonar", "Git", "AWS", "Windows", "Linux", "Kubernetes", "Ansible", "Fortify", "Maven", "CA", "Jira", "Marathon", "Udeploy", "ServiceNow"],
  },
];

/** Not in the résumé. */
export const EDUCATION: EducationItem[] = [];

/** Not in the résumé. */
export const PROJECTS: Project[] = [];

/** Not in the résumé. */
export const CERTIFICATIONS: Certification[] = [];

/** Not in the résumé. */
export const ACHIEVEMENTS: Achievement[] = [];

/* ───────────────────────────── Derived helpers ───────────────────────────── */

const has = (s: string | undefined | null) => typeof s === "string" && s.trim().length > 0;

export const HAS: Record<SectionId, boolean> = {
  about: has(PROFILE.resumeSummary),
  skills: SKILL_GROUPS.some((g) => g.skills.length > 0),
  work: PROJECTS.length > 0,
  certifications: CERTIFICATIONS.length > 0,
  experience: EXPERIENCE.length + EDUCATION.length > 0,
  achievements: ACHIEVEMENTS.length > 0,
  contact: has(PROFILE.email) || has(PROFILE.phone) || has(PROFILE.github) || has(PROFILE.linkedin),
};

/** Section order on the page (spec §4). */
export const SECTION_ORDER: SectionId[] = [
  "about",
  "skills",
  "work",
  "certifications",
  "experience",
  "achievements",
  "contact",
];

/** Visible sections, in order — used to number the section tags 01, 02, … */
export const VISIBLE_SECTIONS = SECTION_ORDER.filter((id) => HAS[id]);

export function sectionIndex(id: SectionId): string {
  return String(VISIBLE_SECTIONS.indexOf(id) + 1).padStart(2, "0");
}

export function visibleNav(): NavItem[] {
  return NAV.filter((n) => HAS[n.id]);
}

/** Education + experience merged chronologically for the timeline. */
export const TIMELINE: (ExperienceItem | EducationItem)[] = [...EDUCATION, ...EXPERIENCE].sort(
  (a, b) => a.sort - b.sort,
);

/** Projects that use a given skill (matched case-insensitively by name). */
export function projectsUsing(skill: string): Project[] {
  const k = skill.toLowerCase();
  return PROJECTS.filter((p) => p.tech.some((t) => t.toLowerCase() === k));
}

/** Prefix a public asset path with the configured basePath (GitHub Pages project sites). */
export function asset(path: string): string {
  if (!path || /^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}

export { has as hasText };
