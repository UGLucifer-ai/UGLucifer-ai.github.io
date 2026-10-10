/**
 * "Ask me" knowledge base + matcher for the hero Q&A. Loaded lazily (dynamic import) on first use.
 *
 * Every answer is drawn ONLY from the résumé (inputs/resume.pdf) and src/lib/data.ts, in first person.
 * No years-of-experience total (the résumé doesn't state one), no salary, availability or visa info.
 * Matching: normalised keywords/phrases + synonyms, with light fuzzy matching (Damerau-Levenshtein ≤ 1–2,
 * prefixes) — a tiny hand-rolled scorer, no library.
 */
import { EXPERIENCE, PROFILE, SKILL_GROUPS, asset } from "@/lib/data";

export type AskLink = { label: string; href: string; download?: boolean; external?: boolean };
export type Answer = { id: string; text: string; links?: AskLink[]; download?: boolean };

/* ───────────── links ───────────── */
const L_EMAIL: AskLink = { label: PROFILE.email, href: `mailto:${PROFILE.email}` };
const L_PHONE: AskLink = { label: PROFILE.phone, href: PROFILE.phoneHref };
const L_LINKEDIN: AskLink = { label: "LinkedIn ↗", href: PROFILE.linkedin, external: true };
const L_CONTACT: AskLink = { label: "Contact ↓", href: "#contact" };
const L_RESUME: AskLink = { label: "Download résumé ↓", href: asset(PROFILE.resume), download: true };
const ASK_DIRECT = [L_CONTACT, L_LINKEDIN];

/* ───────────── facts derived from data.ts ───────────── */
const [NOW, ...PAST] = EXPERIENCE;
const since = (period: string) => period.split(/\s[–-]\s/)[0].trim();
const FIRST = EXPERIENCE[EXPERIENCE.length - 1];
const an = (title: string) => (/^[AEIOU]/i.test(title) ? "an" : "a");
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* ───────────── intents ───────────── */
type Intent = {
  id: string;
  /** "phrase" or "token", optional ":weight" (default 1.5 for tokens, 2 for phrases). */
  keys: string;
  text: string;
  links?: AskLink[];
  download?: boolean;
  /** restricted topics win whenever they match */
  restricted?: boolean;
  /** low-priority small talk */
  weak?: boolean;
};

const I = (id: string, keys: string, text: string, extra: Partial<Intent> = {}): Intent => ({ id, keys, text, ...extra });

export const INTENTS: Intent[] = [
  I("who", "who are you:4|who is:2|yourself:2|introduce|introduction|about you:2|your name:3|name|uday:2|tell me about you:3",
    `I'm ${PROFILE.name}, a ${PROFILE.role}. I'm a Senior DevOps and Cloud Engineer with extensive experience architecting, automating, and operating secure, scalable enterprise infrastructure across AWS, Azure, GCP, and on-premises environments.`),
  I("whatdo", "what do you do:4|do you do:3|what you do:3|role|job title:2|responsibilities|responsibility|specialize|specialise|specialty|speciality|expertise|strength|strengths|good at:2|best at:2|focus|day to day:2|devops:0.6|what is devops",
    "I design, automate and run cloud and Kubernetes platforms: infrastructure as code with Terraform, enterprise CI/CD pipelines, GitOps deployments with Argo CD and Helm, plus DevSecOps scanning and observability. I also handle production support — P1/P2 incidents, root-cause analysis and change management."),
  I("current", "where do you work:4|work now:3|working now:3|currently:2|current:2|now:0.8|present|right now:2|jpmc:3|jp morgan:3|jpmorgan:3|chase:2|current job:4|current role:4|current company:4|latest job:3|latest role:3|employer:1|company:1",
    `I'm currently ${an(NOW.title)} ${NOW.title} at ${NOW.org} (${NOW.place}), since ${since(NOW.period)}. I design secure, highly available AWS and Azure infrastructure for enterprise banking and financial applications with Terraform, and build and manage Kubernetes platforms on Amazon EKS and AKS.`),
  I("past", "past:2|previous:2|previously:2|before:1.5|former:2|prior:2|employers:2.5|companies:2.5|worked at:2|where have you worked:4|where did you work:4|work history:3|career:2|background:1.5|last job:2|other jobs:3|experience:0.4",
    `Before ${NOW.org} I was ${list(PAST.slice(0, 3).map((e) => `${an(e.title)} ${e.title} at ${e.org} (${e.period})`))}. Earlier, I was ${list(PAST.slice(3).map((e) => `${an(e.title)} ${e.title} at ${e.org} (${e.period})`))}.`,
    { links: [{ label: "Experience ↓", href: "#experience" }] }),
  I("cvs", "cvs:4|cvs health:4",
    "At CVS (Remote, Feb 2024 - Apr 2025) I was a Sr. DevOps Engineer supporting healthcare and clinical-trial applications across AWS and Azure. I managed AWS EKS and Kubernetes environments, developed reusable Terraform modules, and automated AWS account provisioning with Terraform, Step Functions, Lambda and Python/Boto3."),
  I("optum", "optum:4|optum health:4|unitedhealth:2",
    "At Optum Health (CA, Aug 2022 – Jan 2024) I was a DevOps Engineer on cloud-native platforms across AWS, GCP and Azure. I built event-driven healthcare data-processing pipelines on GCP, ran containerized workloads on Amazon EKS and ECS, and assessed a GCP-to-Azure migration."),
  I("lincoln", "lincoln:4|lincoln financial:4|lfg:3",
    "At Lincoln Financial Group (Philadelphia, PA, Jul 2020 – Dec 2022) I was a DevOps Engineer / Cloud DevOps Engineer. I set up continuous integration with Jenkins and Maven, administered the SVN architecture, and built highly available AWS environments with EC2, VPC, ELB, Auto Scaling and CloudFormation."),
  I("techm", "tech mahindra:4|mahindra:4|techm:4",
    "At Tech Mahindra (India, Nov 2018 – Jun 2020) I was an Infrastructure & DevOps Engineer on a private cloud. I managed Kubernetes and OpenShift deployments, wrote Helm charts and Dockerfiles, built CI/CD with Jenkins, Git and Azure DevOps, and supported OpenStack-based private cloud environments."),
  I("innominds", "innominds:4|innominds software:4|build engineer:3|first job:3|first role:3",
    "At Innominds Software (India, July 2017 – Oct 2018) I was a Build Engineer. I designed build pipelines with Git, Subversion, Maven, Jenkins and Artifactory for J2EE deployments, automated provisioning with Ansible, and troubleshot Kubernetes pods in production."),
  I("years", "how many years:4|years:2.5|year:1.5|how long:3|total experience:3|experience years:4|years of experience:4|yrs:2.5|seniority:2|how experienced:3|since when:2",
    `My résumé doesn't state a total number of years, so I won't put a number on it. My roles there go back to ${since(FIRST.period)}, when I started as ${an(FIRST.title)} ${FIRST.title} at ${FIRST.org}, and I've been ${an(NOW.title)} ${NOW.title} at ${NOW.org} since ${since(NOW.period)}.`,
    { links: [{ label: "Experience ↓", href: "#experience" }] }),
  I("kubernetes", "kubernetes:3|k8s:3|kube:2|eks:2|aks:1.5|openshift:2|helm:2|argo:2|argocd:2|argo cd:2|gitops:2|cluster:2|clusters:2|pod:1.5|pods:1.5|orchestration:2|namespace|namespaces|container orchestration:3",
    "Kubernetes is one of my core strengths: I've built and run platforms on Amazon EKS, Azure AKS and OpenShift, handling cluster upgrades, node pools, autoscaling, namespaces and production troubleshooting. I deploy with Helm and Argo CD using GitOps — at JPMC I run EKS and AKS for banking applications."),
  I("containers", "docker:3|container:2|containers:2|dockerfile:2|dockerfiles:2|image:1|images:1|containerization:2|containerize:2|containerise:2|ecs:2|registry:1.5|artifactory:2|jfrog:2",
    "I containerize applications with Docker — writing Dockerfiles and optimising images for production — and run them on Kubernetes, Amazon ECS and GCP Cloud Run. I've managed Docker image repositories in JFrog Artifactory and added Sysdig image scanning to delivery pipelines."),
  I("aws", "aws:3|amazon:2|amazon web services:3|ec2:2|s3:2|vpc:2|iam:1.5|lambda:2|route 53:2|route53:2|cloudwatch:1.5|cloudfront:2|rds:2|step functions:2|kms:2|secrets manager:2|elb:2|alb:2|auto scaling:2|autoscaling:1",
    "I work hands-on with AWS — EC2, EKS, ECS, S3, RDS, VPC, IAM, Route 53, ELB/ALB, Auto Scaling, CloudFront, CloudWatch, KMS, Secrets Manager, Lambda and Step Functions. At JPMC I architect secure VPC networking for financial workloads with Terraform, and at CVS I automated AWS account provisioning with Terraform, Step Functions, Lambda and Python/Boto3."),
  I("azure", "azure:3|microsoft azure:3|microsoft:1.5|aks:1.5|acr:2",
    "Yes — I use Azure for AKS, ACR, Azure DevOps, virtual networks, VMs, storage and load balancers. At JPMC and CVS I support applications across AWS and Azure, and at Optum Health I provisioned the equivalent Azure infrastructure with Terraform for a GCP-to-Azure migration."),
  I("gcp", "gcp:3|google cloud:3|google cloud platform:3|google:1.5|cloud run:2|pub/sub:2|pubsub:2|cloud functions:2|memorystore:2",
    "On GCP I built event-driven healthcare data-processing pipelines at Optum Health with Cloud Storage events, Cloud Functions, Pub/Sub and Memorystore, and deployed containers on Cloud Run. I also ran the cost, performance and quality assessments for a GCP-to-Azure migration."),
  I("cloud", "cloud:1.2|clouds:1.5|multi cloud:3|multicloud:3|multi-cloud:3|hybrid:2|hybrid cloud:3|on prem:2|on-prem:2|onprem:2|on premises:2|openstack:2|private cloud:2|which cloud:3|cloud platforms:3|cloud experience:3",
    "I work across AWS, Microsoft Azure, Google Cloud Platform and OpenStack, as well as on-premises environments. Most of my recent work is on AWS and Azure — banking applications at JPMC and healthcare platforms at CVS — and I supported an OpenStack-based private cloud at Tech Mahindra."),
  I("cicd", "cicd:4|ci:2|cd:1.5|pipeline:2.5|pipelines:2.5|jenkins:3|gitlab:2|gitlab ci:3|github actions:3|azure devops:2.5|codepipeline:2.5|continuous integration:3|continuous delivery:3|continuous deployment:3|build:1.2|builds:1.2|deploy:1|deployment:0.8|deployments:0.8|release:1|releases:1|maven:2",
    "I've designed and maintained enterprise CI/CD pipelines with Jenkins, GitLab CI, GitHub Actions, Azure DevOps and AWS CodePipeline, automating builds, testing, security scans, container images, deployments and rollbacks. Jenkins goes back to my Build Engineer days, alongside Maven and Artifactory."),
  I("iac", "terraform:3|terragrunt:3|iac:3|infrastructure as code:4|cloudformation:2.5|cloud formation:2.5|cfn:2|ansible:2.5|configuration management:3|config management:3|provisioning:2|modules:1",
    "I write infrastructure as code with Terraform and Terragrunt — reusable modules for networking, compute, storage, security and Kubernetes across DEV, SIT, UAT and PROD — as well as AWS CloudFormation. For configuration management and automation I use Ansible."),
  I("security", "devsecops:4|security:3|secure:1.5|sonarqube:2|sonar:2|fortify:2|black duck:2|blackduck:2|sysdig:2|veracode:2|42crunch:2|vault:2|hashicorp vault:2|kyverno:2|waf:2|tls:2|scanning:2|compliance:2|secrets:1.5|least privilege:2|zero trust:2|rbac:1.5|vulnerability:2|vulnerabilities:2",
    "I build security into delivery: SonarQube, Fortify, Black Duck, Sysdig, Veracode and 42Crunch scanning in CI/CD, HashiCorp Vault and AWS Secrets Manager for secrets, and IAM least privilege, RBAC, Kyverno, network policies, WAF and TLS on the platform side."),
  I("monitoring", "monitoring:3|monitor:2|observability:3|prometheus:2|grafana:2|datadog:2|dynatrace:2|new relic:2|newrelic:2|elk:2|efk:2|opentelemetry:2|otel:2|zabbix:2|logging:2|logs:1.5|alerting:2|metrics:2|cloudwatch:1.5|apm:2",
    "For observability I use Prometheus, Grafana, ELK/EFK, OpenTelemetry, Datadog, Dynatrace, New Relic, CloudWatch, Sumo Logic and Zabbix to monitor infrastructure, applications and Kubernetes. At JPMC I built monitoring for application availability, infrastructure health, performance and capacity."),
  I("deploy", "blue green:4|blue-green:4|bluegreen:4|canary:3|rolling:2|zero downtime:4|zero-downtime:4|downtime:2|rollback:2.5|rollbacks:2.5|argo rollouts:3|deployment strategy:4|deployment strategies:4|release strategy:3",
    "I've implemented blue-green, canary, rolling and zero-downtime deployments with automated rollback, Helm-based releases and Argo Rollouts. At JPMC I use them to reduce disruption during critical banking production releases."),
  I("scripting", "python:3|bash:3|shell:2|powershell:3|groovy:3|scripting:3|script:2|scripts:2|programming:2.5|coding:2.5|code:1.2|language:2|languages:2|boto3:2|yaml:2|automate:1|automation:1.2",
    "I script in Python, Bash/Shell, PowerShell and Groovy, along with YAML and Boto3 for AWS. I use them to automate infrastructure provisioning, configuration, patching and day-to-day operations."),
  I("tools", "tools:3|tool:2|tech stack:4|stack:2|technologies:2.5|technology:2|tech:1|skills:2.5|skill:2|skill set:3|skillset:3|what do you use:3|toolchain:3|toolbox:3|use:0.5",
    "My core stack is AWS, Azure and GCP; Kubernetes (EKS, AKS, OpenShift), Docker, Helm and Argo CD; Terraform, Terragrunt and Ansible; Jenkins, GitLab CI, GitHub Actions and Azure DevOps; and Prometheus, Grafana and Datadog. The Skills section lists everything on my résumé.",
    { links: [{ label: "Skills ↓", href: "#skills" }] }),
  I("ai", "ai:3|genai:3|gen ai:3|generative:3|generative ai:4|copilot:2.5|github copilot:3|chatgpt:3|codewhisperer:3|mcp:2.5|llm:2|llms:2|artificial intelligence:3",
    "I use Generative AI and AI-assisted engineering tools — GitHub Copilot, Amazon CodeWhisperer, ChatGPT and MCP workflows — to speed up infrastructure automation, scripting and troubleshooting. At Optum Health I also supported AWS containerized platforms for GenAI workloads."),
  I("support", "incident:3|incidents:3|p1:3|p2:2|production support:4|support:1.2|rca:3|root cause:3|troubleshooting:2|troubleshoot:2|servicenow:2.5|jira:2.5|change management:3|hotfix:2.5|sla:2|outage:2|outages:2|runbook:2|runbooks:2|disaster recovery:3|reliability:2|sre:2|site reliability:3",
    "I've handled P1/P2 production incidents, root-cause analysis, hotfix deployments and rollbacks, using ServiceNow and JIRA for change and incident management. I also write runbooks and disaster-recovery procedures to keep production reliable."),
  I("servers", "linux:3|windows:2|server:2|servers:2|apache:2|nginx:2|tomcat:2|websphere:2|weblogic:2|vmware:2|os:1.5|operating system:3|operating systems:3|sysadmin:3|system administration:3|virtualization:2|virtualisation:2",
    "I manage Linux and Windows servers and have installed and configured Apache, Nginx, Tomcat, WebSphere and WebLogic. At Tech Mahindra I also worked with VMware virtualisation and OpenStack-based private cloud."),
  I("architecture", "architecture:3|microservices:3|microservice:3|serverless:3|event driven:3|event-driven:3|hybrid cloud:2|design patterns:2|system design:3",
    "My résumé lists microservices, serverless and event-driven architecture, multi-cloud and hybrid cloud, and containerized platforms. At Optum Health I built event-driven, serverless pipelines on GCP with Cloud Functions, Pub/Sub and Cloud Run."),
  I("networking", "networking:4|network:3|networks:3|subnet:3|subnets:3|nat:2|dns:3|load balancer:3|load balancers:3|load balancing:3|ingress:2|firewall:2",
    "On AWS I've architected VPCs with private and public subnets, NAT Gateways, Application Load Balancers and Route 53 at JPMC. At Lincoln Financial Group I configured servers for HTTP/HTTPS, FTP, NFS, SMB, SMTP, SSH and NTP, and on Kubernetes I use ingress and network policies."),
  I("database", "database:4|databases:4|db:3|dba:3",
    "Databases aren't a focus on my résumé, but it does mention Amazon RDS and highly available database servers on EC2 at Lincoln Financial Group, plus working with database teams on releases. For anything deeper, feel free to ask me directly.",
    { links: ASK_DIRECT }),
  I("domains", "industry:3|industries:3|domain:3|domains:3|banking:2.5|bank:2|finance:2.5|financial:2|fintech:2|healthcare:2.5|health:1.5|clinical:2|sector:2|sectors:2",
    "I've worked mostly in finance and healthcare: banking and financial applications at JPMC, healthcare and clinical-trial platforms at CVS, healthcare data processing at Optum Health, and Lincoln Financial Group before that."),
  I("cost", "cost:3|costs:3|optimization:2|optimisation:2|optimize:2|optimise:2|finops:3|savings:2|budget:2|cost optimization:4",
    "At CVS I identified cloud optimization opportunities through resource utilization, storage, snapshot, capacity and configuration reviews, controlling AWS operational costs. At Optum Health I ran cost, operational and performance assessments with benchmark reports for a GCP-to-Azure migration."),
  I("team", "team:2.5|teams:2.5|teamwork:3|mentor:3|mentoring:3|mentored:3|lead:2|leadership:3|collaborate:2.5|collaboration:2.5|communication:2|soft skills:3|work with others:3",
    "I work closely with development, QA, security, networking, database and infrastructure teams on architecture reviews, releases and troubleshooting. At Optum Health I mentored engineers on Terraform, IaC, Azure adoption, cloud migration and DevOps practices."),
  I("java", "java:3|j2ee:3|jvm:2",
    "Java isn't listed as one of my skills, but my résumé mentions Maven builds and releases of Java projects at Lincoln Financial Group and J2EE build pipelines at Innominds Software. For anything deeper, feel free to ask me directly.",
    { links: ASK_DIRECT }),
  I("contact", "contact:4|reach:3|reach you:4|email:3|e-mail:3|mail:2|phone:3|call:2|number:2|linkedin:3|hire:3|hiring:3|get in touch:4|connect:2|talk:1.5|message:2|interview:2",
    `You can email me at ${PROFILE.email} or call ${PROFILE.phone}, and I'm on LinkedIn too. Everything is also in the Contact section at the bottom of this page.`,
    { links: [L_EMAIL, L_PHONE, L_LINKEDIN, L_CONTACT] }),
  I("resume", "resume:4|cv:4|pdf:3|download:3|curriculum vitae:4|curriculum:3",
    "Here's my résumé — the PDF download should start right away. If it doesn't, use the link below.",
    { links: [L_RESUME], download: true }),
  I("location", "where are you based:5|based:2.5|location:3|located:3|where do you live:5|live:1.5|city:2.5|country:2|from where:2|where are you from:4|remote:1.5|timezone:2|time zone:2",
    "My résumé doesn't list where I'm based. My two most recent roles, at JPMC and CVS, are remote — for anything else, feel free to ask me directly.",
    { links: ASK_DIRECT }),
  I("education", "education:4|degree:3|university:3|college:3|school:2|graduate:2.5|graduation:3|bachelor:3|bachelors:3|master:2|masters:3|btech:3|b.tech:3|certification:4|certifications:4|certified:3|certificate:3|certificates:3|study:2|studied:3",
    "My résumé doesn't list education or certifications, so I'd rather not guess. Feel free to ask me directly via the Contact section or LinkedIn.",
    { links: ASK_DIRECT }),
  I("projects", "projects:3|project:2|side project:4|side projects:4|open source:4|github profile:4|github link:4|your github:4|repo:2.5|repos:2.5|repository:2|repositories:2|portfolio:2",
    "My résumé doesn't include a projects list or a GitHub profile — my work is described role by role in the Experience section. Happy to talk through any of it directly.",
    { links: [{ label: "Experience ↓", href: "#experience" }, L_CONTACT] }),
  I("salary", "salary:5|compensation:5|pay:3|paid:3|rate:2.5|rates:2.5|ctc:5|expected salary:6|money:3|wage:4|wages:4|hourly:3|package:2",
    "Compensation isn't something my résumé covers, so I'll leave it for a direct conversation. Please reach out via the Contact section or LinkedIn.",
    { links: ASK_DIRECT, restricted: true }),
  I("availability", "available:5|availability:5|notice period:6|notice:3|start date:5|when can you start:6|can you start:5|join:2.5|joining:3|open to work:6|looking for:3|job search:4|relocate:5|relocation:5|full time:3|full-time:3|contract:3|freelance:4|part time:3|open to:3",
    "My availability isn't on my résumé, so I'll leave that for a direct conversation. Please reach out via the Contact section or LinkedIn.",
    { links: ASK_DIRECT, restricted: true }),
  I("visa", "visa:6|sponsorship:6|sponsor:5|h1b:6|h-1b:6|h1-b:6|green card:6|citizen:5|citizenship:6|work authorization:6|authorization:4|authorized:4|work permit:6|ead:5|opt:3|immigration:5",
    "Work authorization isn't covered on my résumé, so I'll leave that for a direct conversation. Please reach out via the Contact section or LinkedIn.",
    { links: ASK_DIRECT, restricted: true }),
  I("greeting", "hi:2|hello:2|hey:2|hiya:2|howdy:2|yo:1.5|good morning:2|good afternoon:2|good evening:2|hola:2|namaste:2",
    "Hi! I'm Uday — ask me about my experience, skills or how to reach me, or tap one of the questions below.",
    { weak: true }),
  I("thanks", "thanks:2|thank you:2|thank:2|thx:2|cheers:1.5|bye:2|goodbye:2|great:1|awesome:1|cool:1|nice:1",
    "You're welcome! If you'd like to talk more, the Contact section has my email, phone and LinkedIn.",
    { links: [L_CONTACT, L_LINKEDIN], weak: true }),
];

export const FALLBACK: Answer = {
  id: "fallback",
  text: "I can only answer from my résumé, and that isn't covered there. Feel free to ask me directly — my details are in the Contact section, or reach me on LinkedIn.",
  links: ASK_DIRECT,
};

/* ───────────── tools on the résumé (Technical Skills + experience) ───────────── */
/** Employers whose résumé section mentions each tool (generated from inputs/resume.pdf). */
const WHERE: Record<string, string[]> = {"AWS":["JPMC","CVS","Optum Health","Lincoln Financial Group","Innominds Software"],"Microsoft Azure":["JPMC","CVS","Optum Health"],"Google Cloud Platform (GCP)":["Optum Health"],"OpenStack":["Tech Mahindra"],"EC2":["JPMC","CVS","Optum Health","Lincoln Financial Group"],"EKS":["JPMC","CVS","Optum Health"],"ECS":["Optum Health"],"S3":["JPMC","Optum Health","Lincoln Financial Group"],"RDS":["Optum Health","Lincoln Financial Group"],"VPC":["JPMC","Lincoln Financial Group"],"IAM":["JPMC","CVS","Lincoln Financial Group"],"Route 53":["JPMC","Lincoln Financial Group"],"ELB/ALB":["JPMC","Lincoln Financial Group"],"Auto Scaling":["JPMC","Lincoln Financial Group"],"CloudFront":[],"CloudWatch":["Lincoln Financial Group"],"CloudTrail":["Optum Health"],"AWS Config":["Optum Health"],"AWS KMS":["JPMC"],"Secrets Manager":["JPMC"],"Lambda":["CVS","Lincoln Financial Group"],"Step Functions":["CVS"],"AKS":["JPMC"],"ACR":["JPMC"],"Azure DevOps":["JPMC","Tech Mahindra"],"Cloud Storage":["Optum Health"],"Cloud Functions":["Optum Health"],"Pub/Sub":["Optum Health"],"Memorystore":["Optum Health"],"Cloud Run":["Optum Health"],"Kubernetes":["JPMC","CVS","Optum Health","Tech Mahindra","Innominds Software"],"OpenShift":["Tech Mahindra"],"Docker":["JPMC","CVS","Optum Health","Tech Mahindra"],"Helm":["JPMC","CVS","Optum Health","Tech Mahindra"],"Argo CD":["JPMC","CVS"],"Argo Rollouts":[],"GitOps":["JPMC","CVS"],"Terraform":["JPMC","CVS","Optum Health"],"Terragrunt":[],"AWS CloudFormation":["Lincoln Financial Group"],"Ansible":["JPMC","CVS","Tech Mahindra","Innominds Software"],"Jenkins":["JPMC","CVS","Optum Health","Lincoln Financial Group","Tech Mahindra","Innominds Software"],"GitLab CI":["CVS"],"GitHub Actions":["JPMC","CVS"],"AWS CodePipeline":[],"Maven":["Lincoln Financial Group","Innominds Software"],"JFrog Artifactory":["Optum Health","Innominds Software"],"Git":["JPMC","CVS","Optum Health","Lincoln Financial Group","Tech Mahindra","Innominds Software"],"GitHub":["Lincoln Financial Group"],"GitLab":["CVS","Innominds Software"],"Bitbucket":[],"Subversion":["Lincoln Financial Group","Innominds Software"],"SonarQube":["JPMC","Optum Health","Innominds Software"],"Fortify":["JPMC","Innominds Software"],"Black Duck":["JPMC","Innominds Software"],"Sysdig":["JPMC","Optum Health"],"Veracode":[],"42Crunch":["Optum Health"],"HashiCorp Vault":["JPMC"],"Kyverno":[],"Prometheus":["JPMC","CVS","Tech Mahindra"],"Grafana":["JPMC","CVS","Tech Mahindra","Innominds Software"],"ELK/EFK":["Optum Health","Tech Mahindra"],"OpenTelemetry":[],"Datadog":["JPMC"],"Dynatrace":["JPMC"],"New Relic":["CVS"],"Sumo Logic":["Innominds Software"],"Kibana":["Innominds Software"],"Logstash":["Innominds Software"],"Zabbix":["Tech Mahindra"],"Python":["JPMC","CVS","Optum Health","Lincoln Financial Group","Tech Mahindra"],"Bash/Shell":["JPMC","CVS","Lincoln Financial Group","Tech Mahindra"],"PowerShell":[],"Groovy":[],"YAML":["JPMC"],"Boto3":["CVS","Lincoln Financial Group"],"Linux":["JPMC","CVS","Lincoln Financial Group","Tech Mahindra","Innominds Software"],"Windows":["Lincoln Financial Group","Innominds Software"],"Apache":["Lincoln Financial Group","Innominds Software"],"Nginx":["Innominds Software"],"Tomcat":["Lincoln Financial Group","Innominds Software"],"WebSphere":["Innominds Software"],"WebLogic":["Innominds Software"],"GitHub Copilot":[],"Amazon CodeWhisperer":[],"ChatGPT":[],"MCP":[],"ServiceNow":["JPMC","Innominds Software"],"JIRA":["JPMC","Innominds Software"],"Nagios":["Lincoln Financial Group"],"Puppet":["Lincoln Financial Group"],"Nexus":["Lincoln Financial Group"],"Ant":["Lincoln Financial Group"],"Hudson":["Lincoln Financial Group"],"VMware":["Tech Mahindra"],"IIS":["Lincoln Financial Group"],"Marathon":["Innominds Software"],"uDeploy":["Innominds Software"]};

const ALIASES: Record<string, string> = {
  "Microsoft Azure": "azure",
  "Google Cloud Platform (GCP)": "gcp|google cloud",
  EKS: "eks|amazon eks",
  AKS: "aks|azure aks",
  "ELB/ALB": "elb|alb",
  "Auto Scaling": "auto scaling|autoscaling",
  "AWS KMS": "kms",
  "AWS CloudFormation": "cloudformation|cloud formation|cfn",
  "AWS CodePipeline": "codepipeline",
  "AWS Config": "aws config",
  "JFrog Artifactory": "artifactory|jfrog",
  "Argo CD": "argo cd|argocd",
  "HashiCorp Vault": "vault|hashicorp vault",
  "Black Duck": "black duck|blackduck",
  SonarQube: "sonarqube|sonar",
  "ELK/EFK": "elk|efk|elasticsearch|elastic",
  "New Relic": "new relic|newrelic",
  "Sumo Logic": "sumo logic|sumologic",
  "Bash/Shell": "bash|shell",
  "GitHub Copilot": "copilot|github copilot",
  "Amazon CodeWhisperer": "codewhisperer",
  Subversion: "subversion|svn",
  "Pub/Sub": "pub/sub|pubsub",
  "Route 53": "route 53|route53",
  OpenTelemetry: "opentelemetry|otel",
  JIRA: "jira",
  uDeploy: "udeploy|u deploy",
};
/** Generic table entries that are not tools a visitor would ask about. */
const SKIP = new Set(["Storage", "Virtual Networks", "Virtual Machines", "Load Balancers", "Secrets", "OCR Services", "Secrets Management"]);
const EXTRA = ["Nagios", "Puppet", "Nexus", "Ant", "Hudson", "VMware", "IIS", "Marathon", "uDeploy"]; // experience-only tools

type Tool = { name: string; cat: string; keys: string[] };
const TOOLS: Tool[] = [
  ...SKILL_GROUPS.flatMap((g) =>
    g.skills.filter((s) => !SKIP.has(s.name) && WHERE[s.name] !== undefined).map((s) => ({ name: s.name, cat: g.family })),
  ),
  ...EXTRA.map((name) => ({ name, cat: "" })),
].map((t) => ({ ...t, keys: (ALIASES[t.name] ?? t.name.toLowerCase()).split("|") }));

/** Common tools that are NOT on the résumé (for honest "not on my résumé" answers). */
const NOT_ON_RESUME: Record<string, string> = Object.fromEntries(
  ("Pulumi|Chef|Spinnaker|Tekton|Istio|Linkerd|Nomad|Consul|Vagrant|Packer|CircleCI|Travis CI:travis|TeamCity|Bamboo|Splunk|PagerDuty|Rancher|k3s|Crossplane|Flux:flux|FluxCD|Go:golang|Rust|Ruby|Node.js:nodejs|Node.js:node.js|React|Angular|Vue|Kafka|RabbitMQ|Redis|MongoDB|PostgreSQL:postgres|PostgreSQL|MySQL|Oracle|Snowflake|Databricks|Spark|Hadoop|Airflow|Cassandra|Heroku|DigitalOcean|Cloudflare|Vercel|Netlify|Podman|Loki|Jaeger|Zipkin|Thanos|Velero|Karpenter|Cilium|Calico|Envoy|Traefik|HAProxy|Keycloak|Okta|Snyk|Trivy|Checkov|Aqua|Prisma Cloud:prisma|Wiz|Falco|OPA:opa|Gatekeeper|SaltStack|Bicep|AWS CDK:cdk|Fargate|DynamoDB|SQS|SNS|Kinesis|EFS|Glue|Athena|Redshift|BigQuery|GKE|Anthos|Tableau|Power BI:powerbi|SAP|Salesforce|MLOps|TensorFlow|PyTorch|Kubeflow|SageMaker|PHP|Scala|Kotlin|Swift|TypeScript|JavaScript|.NET:dotnet|.NET:.net|C#:c#|C++:c++|Elastic Beanstalk:beanstalk|SQL:sql|NoSQL:nosql")
    .split("|")
    .map((s) => {
      const [name, key] = s.split(":");
      return [(key ?? name).toLowerCase(), name];
    }),
);

/* ───────────── matching ───────────── */
export function normalize(q: string): string {
  return ` ${q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bci\s*[/&-]?\s*cd\b/g, "cicd")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+#./ -]+/g, " ")
    .replace(/(^|\s)[.\-/]+|[.\-/?!]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/** Damerau-Levenshtein (optimal string alignment) with an early exit above `max`. */
function dl(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** 1 = exact, 0.75 = fuzzy (typo), 0.6 = prefix, 0 = no match. */
function hit(norm: string, tokens: string[], key: string): number {
  if (key.includes(" ") || /[^a-z0-9]/.test(key)) return norm.includes(` ${key} `) ? 1 : 0;
  if (tokens.includes(key)) return 1;
  if (key.length < 5) return 0;
  const max = key.length >= 8 ? 2 : 1;
  for (const t of tokens) {
    if (t.length >= 4 && dl(t, key, max) <= max) return 0.75;
    if (t.length >= 5 && key.startsWith(t)) return 0.6;
  }
  return 0;
}

const parsed = INTENTS.map((it) => ({
  it,
  keys: it.keys.split("|").map((k) => {
    const [key, w] = k.split(/:(?=[\d.]+$)/);
    return { key, w: w ? Number(w) : key.includes(" ") ? 2 : 1.5 };
  }),
}));

export type Match = { answer: Answer; intent: string; score: number };

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STOP = new Set("a an the it this that you me your my them him her us something anything stuff things".split(" "));

export function ask(question: string): Match {
  const norm = normalize(question);
  const raw = norm.trim().split(" ").filter(Boolean);
  const tokens = [...raw, ...raw.filter((t) => t.length > 4 && t.endsWith("s")).map((t) => t.slice(0, -1))];
  if (!raw.length) return { answer: FALLBACK, intent: "fallback", score: 0 };

  const scored = parsed
    .map(({ it, keys }) => {
      let score = 0;
      let exact = false;
      for (const k of keys) {
        const h = hit(norm, tokens, k.key);
        if (h === 1) exact = true;
        // restricted topics (salary/availability/visa) only on exact words — "contact" must not become "contract"
        if (h === 1 || !it.restricted) score += k.w * h;
      }
      return { it, score, exact };
    })
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score);

  const restricted = scored.find((s) => s.it.restricted);
  if (restricted) return { answer: toAnswer(restricted.it), intent: restricted.it.id, score: restricted.score };

  const strong = scored.filter((s) => !s.it.weak);
  const best = strong[0] ?? scored[0];

  const tool = TOOLS.find((t) => t.keys.some((k) => hit(norm, tokens, k) >= (k.length >= 6 ? 0.75 : 1)));
  const unknown = Object.keys(NOT_ON_RESUME).find((k) => norm.includes(` ${k} `));
  const unknownName = unknown ? NOT_ON_RESUME[unknown] : "";
  const notOn = (name: string) => `${name} isn't on my résumé, but feel free to ask me directly about it via the Contact section or LinkedIn.`;

  // a specific tool beats a broad topic whose answer doesn't mention it
  if (tool && (!best || best.it.weak || !tool.keys.some((k) => best.it.text.toLowerCase().includes(k)) && !best.it.text.includes(tool.name))) {
    const where = WHERE[tool.name] ?? [];
    let text = `Yes — ${tool.name} is on my résumé${tool.cat ? `, under ${tool.cat}` : ""}.`;
    if (where.length) text += ` I've used it at ${list(where)}.`;
    if (unknownName) text += ` ${unknownName} isn't on my résumé, though.`;
    return { answer: { id: `tool:${tool.name}`, text, links: [{ label: "Skills ↓", href: "#skills" }] }, intent: "tool", score: 2 };
  }
  if (best && (best.it.weak || !best.exact) && unknownName) return { answer: { id: "not-on-resume", text: notOn(unknownName), links: ASK_DIRECT }, intent: "not-on-resume", score: 1 };
  if (best) {
    const a = toAnswer(best.it);
    if (unknownName && !best.it.weak) a.text += ` ${unknownName} isn't on my résumé, though.`;
    return { answer: a, intent: best.it.id, score: best.score };
  }
  if (unknownName) return { answer: { id: "not-on-resume", text: notOn(unknownName), links: ASK_DIRECT }, intent: "not-on-resume", score: 1 };

  // "do you know X / experience with X" for an X we know nothing about
  const m = norm.match(/ (?:know|use|used|using|experience (?:with|in)|worked (?:with|on)|familiar with|skilled in|good at|work with) ([a-z0-9+#.][a-z0-9+#.-]{1,24}) /);
  if (m && !STOP.has(m[1])) return { answer: { id: "not-on-resume", text: notOn(capital(m[1])), links: ASK_DIRECT }, intent: "not-on-resume", score: 1 };

  return { answer: FALLBACK, intent: "fallback", score: 0 };
}

function toAnswer(it: Intent): Answer {
  return { id: it.id, text: it.text, links: it.links, download: it.download };
}

/**
 * What the character says in each chip's lip-synced answer clip (public/hero/answers/<id>.*), word for word —
 * the bubble shows exactly this text as the caption. Keep in sync with clips/ANSWER-CLIPS.md.
 * Each is ~15–22 words (6–8 s spoken) and uses only résumé facts.
 */
export const CHIP_SCRIPTS: Record<string, string> = {
  who: "Hi, I'm Uday Charan Gopi, a Senior DevOps and Cloud Engineer. I automate and run secure infrastructure across AWS, Azure and GCP.",
  whatdo: "I design and automate cloud and Kubernetes platforms: infrastructure as code with Terraform, CI/CD pipelines, and GitOps deployments.",
  current: "Since May 2025, I've been a Senior DevOps Engineer at JPMC, building secure AWS and Azure infrastructure for banking.",
  kubernetes: "I've run Kubernetes on EKS, AKS and OpenShift, handling upgrades, autoscaling and troubleshooting, and deploying with Helm and Argo CD.",
  aws: "I'm hands-on with AWS: EC2, EKS, VPC and IAM. At JPMC I build secure infrastructure for banking applications.",
  cicd: "I've built CI/CD pipelines with Jenkins, GitHub Actions and Azure DevOps, automating builds, testing, security scans and rollbacks.",
  tools: "My core stack is AWS, Azure and Google Cloud, plus Kubernetes, Docker, Helm, Argo CD, Terraform, Ansible, Jenkins, Prometheus and Grafana.",
  contact: "Thanks for asking! You can reach me through the contact section or LinkedIn below. I'd love to hear from you.",
  resume: "Sure, it's downloading now. If it doesn't start, just use the download button below.",
};

/** Answer for a suggested chip: its clip script as the text, with the intent's links. */
export function answerFor(id: string): Answer {
  const it = INTENTS.find((x) => x.id === id);
  if (!it) return FALLBACK;
  const a = toAnswer(it);
  if (CHIP_SCRIPTS[id]) a.text = CHIP_SCRIPTS[id];
  return a;
}
