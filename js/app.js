// ===================== STORAGE HELPERS (localStorage — fast local cache) =====================
const S = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k)
};

// ===================== FIREBASE HELPERS (compat SDK) =====================
// Paths: users/{uid}  →  users/{uid}/data/{key}  →  shared/{key}

async function fbSave(key, data) {
  if (!window._db || !window._fbUid) return;
  try {
    await window._db
      .collection('users').doc(window._fbUid)
      .collection('data').doc(key)
      .set({ payload: JSON.stringify(data), updatedAt: new Date().toISOString() });
  } catch(e) { console.warn('fbSave error:', e); }
}

async function fbLoad(key) {
  if (!window._db || !window._fbUid) return null;
  try {
    const snap = await window._db
      .collection('users').doc(window._fbUid)
      .collection('data').doc(key)
      .get();
    if (snap.exists) { return JSON.parse(snap.data().payload); }
  } catch(e) { console.warn('fbLoad error:', e); }
  return null;
}

async function fbSaveShared(key, data) {
  if (!window._db) return;
  try {
    await window._db.collection('shared').doc(key)
      .set({ payload: JSON.stringify(data), updatedAt: new Date().toISOString() });
  } catch(e) { console.warn('fbSaveShared error:', e); }
}

async function fbLoadShared(key) {
  if (!window._db) return null;
  try {
    const snap = await window._db.collection('shared').doc(key).get();
    if (snap.exists) { return JSON.parse(snap.data().payload); }
  } catch(e) { console.warn('fbLoadShared error:', e); }
  return null;
}

async function fbSaveUserMeta(data) {
  if (!window._db || !window._fbUid) return;
  try {
    await window._db.collection('users').doc(window._fbUid).set(data, { merge: true });
  } catch(e) { console.warn('fbSaveUserMeta error:', e); }
}

async function fbGetAllUsers() {
  if (!window._db) return [];
  try {
    const snap = await window._db.collection('users').get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch(e) { console.warn('fbGetAllUsers error:', e); return []; }
}

async function fbLoadUserData(uid) {
  if (!window._db) return {};
  const keys = ['subjects','tasks','sessions','attendance','leaves','notes','activeTimers'];
  const result = {};
  await Promise.all(keys.map(async k => {
    try {
      const snap = await window._db.collection('users').doc(uid).collection('data').doc(k).get();
      result[k] = snap.exists ? (JSON.parse(snap.data().payload) || []) : [];
    } catch(e) { result[k] = []; }
  }));
  return result;
}

// ===================== STATE =====================
const SUBJECT_COLORS = ['#7c3aed','#38bdf8','#22c55e','#f59e0b','#ef4444','#ec4899','#14b8a6','#a3e635','#fb923c','#818cf8'];
// ===================== AI ENGINEER SYLLABUS SEED DATA =====================
// One-time seed: adds a complete "AI Engineer" subject with the full syllabus
// broken into atomic to-do topics. Only runs if the subject doesn't already
// exist for the current student, and never modifies any existing subject.
const AI_ENGINEER_TOPICS = [
    "Python Programming — Syntax",
    "Python Programming — Data structures",
    "Python Programming — Functions",
    "Python Programming — OOP concepts",
    "Python Programming — Virtual environments",
    "Version Control — Git fundamentals",
    "Version Control — GitHub fundamentals",
    "Version Control — Branching",
    "Version Control — Collaboration workflow",
    "Linear Algebra — Vectors",
    "Linear Algebra — Matrices",
    "Linear Algebra — Matrix operations",
    "Linear Algebra — Eigenvalues",
    "Linear Algebra — Eigenvectors",
    "Calculus — Derivatives",
    "Calculus — Partial derivatives",
    "Calculus — Gradients",
    "Calculus — Chain rule",
    "Probability & Statistics — Probability distributions",
    "Probability & Statistics — Bayes theorem",
    "Probability & Statistics — Hypothesis testing",
    "Probability & Statistics — Descriptive statistics",
    "Data Acquisition — Working with APIs",
    "Data Acquisition — Web scraping basics",
    "Data Acquisition — File format: CSV",
    "Data Acquisition — File format: JSON",
    "Data Acquisition — File format: Parquet",
    "NumPy & Pandas — Array operations",
    "NumPy & Pandas — Dataframes",
    "NumPy & Pandas — Data cleaning",
    "NumPy & Pandas — Missing value treatment",
    "EDA — Univariate analysis",
    "EDA — Bivariate analysis",
    "EDA — Outlier detection",
    "EDA — Correlation analysis",
    "Data Visualization — Matplotlib",
    "Data Visualization — Seaborn",
    "Data Visualization — Building insight-driven charts",
    "Data Visualization — Building dashboards",
    "SQL for Data Engineers — Joins",
    "SQL for Data Engineers — Aggregations",
    "SQL for Data Engineers — Window functions",
    "SQL for Data Engineers — Query optimization basics",
    "Intro to ML — Supervised learning",
    "Intro to ML — Unsupervised learning",
    "Intro to ML — Reinforcement learning",
    "Intro to ML — ML workflow",
    "Regression — Linear regression",
    "Regression — Polynomial regression",
    "Regression — Ridge regularization",
    "Regression — Lasso regularization",
    "Classification — Logistic regression",
    "Classification — KNN",
    "Classification — Decision Trees",
    "Classification — SVM",
    "Classification — Naive Bayes",
    "Ensemble Learning — Random Forest",
    "Ensemble Learning — Bagging",
    "Ensemble Learning — Boosting: XGBoost",
    "Ensemble Learning — Boosting: LightGBM",
    "Ensemble Learning — Boosting: Gradient Boosting",
    "Unsupervised Learning — K-Means",
    "Unsupervised Learning — Hierarchical clustering",
    "Unsupervised Learning — DBSCAN",
    "Unsupervised Learning — PCA & dimensionality reduction",
    "Model Evaluation & FE — Cross-validation",
    "Model Evaluation & FE — Metric: Precision",
    "Model Evaluation & FE — Metric: Recall",
    "Model Evaluation & FE — Metric: F1 Score",
    "Model Evaluation & FE — Metric: ROC-AUC",
    "Model Evaluation & FE — Feature scaling",
    "Model Evaluation & FE — Feature encoding",
    "Model Evaluation & FE — Hyperparameter tuning",
    "Neural Network Basics — Perceptron",
    "Neural Network Basics — Activation functions",
    "Neural Network Basics — Forward propagation",
    "Neural Network Basics — Backward propagation",
    "Training Deep Networks — Loss functions",
    "Training Deep Networks — Optimizer: SGD",
    "Training Deep Networks — Optimizer: Adam",
    "Training Deep Networks — Regularization: Dropout",
    "Training Deep Networks — Regularization: Batch Norm",
    "CNN — Convolution",
    "CNN — Pooling",
    "CNN — Architecture: ResNet",
    "CNN — Architecture: VGG",
    "CNN — Architecture: EfficientNet",
    "Sequence Models — RNN",
    "Sequence Models — LSTM",
    "Sequence Models — GRU",
    "Sequence Models — Applications",
    "DL Frameworks — PyTorch",
    "DL Frameworks — TensorFlow & Keras",
    "DL Frameworks — Model training pipeline",
    "DL Frameworks — GPU basics",
    "Text Preprocessing — Tokenization",
    "Text Preprocessing — Stemming/Lemmatization",
    "Text Preprocessing — Stop-word removal",
    "Text Preprocessing — Regex for text",
    "Text Representation — Bag-of-Words",
    "Text Representation — TF-IDF",
    "Text Representation — Word2Vec",
    "Text Representation — GloVe embeddings",
    "Transformer Architecture — Attention mechanism",
    "Transformer Architecture — Encoder-Decoder",
    "Transformer Architecture — Positional Encoding",
    "Pretrained LMs — BERT",
    "Pretrained LMs — GPT family",
    "Pretrained LMs — Fine-tuning for classification",
    "Pretrained LMs — Fine-tuning for NER",
    "Pretrained LMs — Fine-tuning for QA",
    "NLP Applications — Sentiment analysis",
    "NLP Applications — Text summarization",
    "NLP Applications — Named entity recognition",
    "NLP Applications — Chatbots",
    "Foundations of GenAI — LLM architecture overview",
    "Foundations of GenAI — Tokens",
    "Foundations of GenAI — Context window",
    "Foundations of GenAI — Model families (open & closed source)",
    "Prompt Engineering — Zero-shot prompting",
    "Prompt Engineering — Few-shot prompting",
    "Prompt Engineering — Chain-of-thought",
    "Prompt Engineering — Prompt templates",
    "Prompt Engineering — Structured output",
    "RAG — Embeddings",
    "RAG — Vector database: Pinecone",
    "RAG — Vector database: ChromaDB",
    "RAG — Vector database: FAISS",
    "RAG — Chunking strategies",
    "Fine-Tuning & Adaptation — Transfer learning",
    "Fine-Tuning & Adaptation — LoRA",
    "Fine-Tuning & Adaptation — QLoRA",
    "Fine-Tuning & Adaptation — PEFT",
    "Fine-Tuning & Adaptation — Instruction tuning",
    "Fine-Tuning & Adaptation — RLHF overview",
    "Agentic AI & Orchestration — LangChain",
    "Agentic AI & Orchestration — LangGraph",
    "Agentic AI & Orchestration — Tool/function calling",
    "Agentic AI & Orchestration — Multi-agent systems",
    "Agentic AI & Orchestration — AI agent design patterns",
    "LLM Evaluation & Guardrails — Evaluation metrics",
    "LLM Evaluation & Guardrails — Hallucination mitigation",
    "LLM Evaluation & Guardrails — Responsible prompting",
    "LLM Evaluation & Guardrails — Output validation",
    "Image Processing Fundamentals — Image representation",
    "Image Processing Fundamentals — Filtering",
    "Image Processing Fundamentals — Edge detection",
    "Image Processing Fundamentals — OpenCV basics",
    "CNN-based Vision Tasks — Image classification",
    "CNN-based Vision Tasks — Transfer learning with pretrained models",
    "Object Detection & Segmentation — YOLO",
    "Object Detection & Segmentation — Faster R-CNN",
    "Object Detection & Segmentation — U-Net",
    "Object Detection & Segmentation — Semantic vs instance segmentation",
    "Generative Vision Models — GANs (basic architecture)",
    "Generative Vision Models — Diffusion models",
    "Generative Vision Models — Image generation overview",
    "Model Packaging & Serving — REST APIs with FastAPI",
    "Model Packaging & Serving — REST APIs with Flask",
    "Model Packaging & Serving — Containerization with Docker",
    "CI/CD for ML — Automated pipelines",
    "CI/CD for ML — Testing ML code",
    "CI/CD for ML — GitHub Actions basics",
    "Experiment Tracking & Versioning — MLflow",
    "Experiment Tracking & Versioning — DVC",
    "Experiment Tracking & Versioning — Model registry concepts",
    "Cloud Platforms for AI — AWS AI services overview",
    "Cloud Platforms for AI — GCP AI services overview",
    "Cloud Platforms for AI — Azure AI services overview",
    "Cloud Platforms for AI — Model hosting",
    "Cloud Platforms for AI — GPU compute basics",
    "Monitoring & Scaling — Model drift detection",
    "Monitoring & Scaling — Logging",
    "Monitoring & Scaling — Load balancing",
    "Monitoring & Scaling — A/B testing for models",
    "AI System Design — Designing scalable AI pipelines",
    "AI System Design — System design interview patterns for AI roles",
    "Responsible AI — Bias & fairness",
    "Responsible AI — Explainability: SHAP",
    "Responsible AI — Explainability: LIME",
    "Responsible AI — Data privacy considerations",
    "AI Security — Prompt injection",
    "AI Security — Adversarial attacks",
    "AI Security — Data poisoning",
    "AI Security — Model security best practices",
    "Career Readiness — Resume/portfolio building",
    "Career Readiness — Technical interview preparation",
    "Career Readiness — Open-source contribution",
    "Capstone Project — End-to-end AI product (ML/DL/LLM components)",
    "Capstone Project — Deployment",
    "Capstone Project — Documentation"
];

function seedAIEngineerSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'AI Engineer');
  if (alreadyExists) return;
  const id = 'subj_aieng_' + Date.now();
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  const topics = AI_ENGINEER_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'AI Engineer', color, topics });
  saveData('subjects');
}

// ===================== AGENTIC AI SYLLABUS SEED DATA =====================
// One-time seed: adds a complete "Agentic AI" subject with the full syllabus
// broken into atomic to-do topics. Only runs if the subject doesn't already
// exist for the current student, and never modifies any existing subject.
const AGENTIC_AI_TOPICS = [
  // Unit 1: Programming, Python & AI/ML Foundations
  "Python Essentials — Syntax & data structures",
  "Python Essentials — Functions",
  "Python Essentials — OOP concepts",
  "Python Essentials — Async programming basics (asyncio)",
  "Version Control — Git & GitHub fundamentals",
  "Version Control — Branching",
  "Version Control — Collaboration workflow",
  "AI/ML Foundations — What is AI/ML",
  "AI/ML Foundations — Types of learning",
  "AI/ML Foundations — Neural network basics (conceptual)",
  "Working with APIs — REST APIs & JSON",
  "Working with APIs — Authentication (API keys/OAuth)",
  "Working with APIs — Python requests/httpx libraries",
  "Environment & Tooling — Virtual environments & package management",
  "Environment & Tooling — IDE/Jupyter setup for AI development",
  // Unit 2: Large Language Model Foundations
  "LLM Architecture — Transformers & self-attention",
  "LLM Architecture — Tokens & embeddings",
  "LLM Architecture — Context window",
  "Model Families & Landscape — Open-source vs closed-source LLMs",
  "Model Families & Landscape — Model sizes, capabilities & limitations",
  "Inference & APIs — Calling LLM APIs (OpenAI, Anthropic)",
  "Inference & APIs — Calling open-source LLMs via Hugging Face/Ollama",
  "Inference & APIs — Parameters: temperature, top-p, max tokens",
  "Embeddings & Semantic Search — Vector representations",
  "Embeddings & Semantic Search — Similarity search & use cases",
  "Limitations of Plain LLMs — Hallucination",
  "Limitations of Plain LLMs — Lack of memory",
  "Limitations of Plain LLMs — Lack of real-world action",
  // Unit 3: Prompt & Context Engineering
  "Prompting Fundamentals — Zero-shot prompting",
  "Prompting Fundamentals — Few-shot prompting",
  "Prompting Fundamentals — Role-based prompting",
  "Advanced Prompting — Chain-of-Thought (CoT)",
  "Advanced Prompting — Self-Consistency",
  "Advanced Prompting — ReAct-style prompting",
  "Structured Output — JSON mode & schema-constrained generation",
  "Structured Output — Output parsing & validation",
  "Context Engineering — Context window management",
  "Context Engineering — Context compression & relevance filtering",
  "Prompt Management — Prompt templates & versioning",
  "Prompt Management — Testing & iteration workflows",
  // Unit 4: Tool Use, Function Calling & APIs
  "Function/Tool Calling — Defining tool schemas",
  "Function/Tool Calling — Structured function calling in LLM APIs",
  "Building Custom Tools — Wrapping APIs as agent-usable tools",
  "Building Custom Tools — Wrapping databases as agent-usable tools",
  "Building Custom Tools — Code execution as agent-usable tools",
  "Tool Selection & Routing — How agents decide which tool to call",
  "Tool Selection & Routing — Multi-tool reasoning",
  "Model Context Protocol (MCP) — Standardizing tool/context exposure",
  "Model Context Protocol (MCP) — MCP servers and clients",
  "Code-Executing Agents — Sandboxed code interpreters",
  "Code-Executing Agents — Agents that write and run code",
  // Unit 5: Retrieval-Augmented Generation (RAG) for Agents
  "RAG Fundamentals — Why grounding matters",
  "RAG Fundamentals — Retrieval pipeline overview",
  "Document Processing — Chunking strategies",
  "Document Processing — Metadata & document loaders",
  "Vector Databases — Pinecone",
  "Vector Databases — ChromaDB",
  "Vector Databases — FAISS",
  "Vector Databases — Weaviate",
  "Vector Databases — Indexing & similarity search",
  "Advanced Retrieval — Hybrid search",
  "Advanced Retrieval — Re-ranking",
  "Advanced Retrieval — Query expansion & rewriting",
  "Agentic RAG — Agents that decide when/what to retrieve",
  "Agentic RAG — Multi-hop retrieval reasoning",
  // Unit 6: Agent Reasoning Architectures
  "ReAct Pattern — Reasoning + Acting loops",
  "ReAct Pattern — Thought-action-observation cycles",
  "Plan-and-Execute Agents — Task decomposition",
  "Plan-and-Execute Agents — Planning before acting",
  "Reflection & Self-Critique — Agents that evaluate their own outputs",
  "Reflection & Self-Critique — Agents that improve their own outputs",
  "Tree-of-Thought — Exploring multiple reasoning paths",
  "Graph-of-Thought — Exploring multiple reasoning paths",
  "Goal-Directed Autonomous Agents — Long-horizon task pursuit",
  "Goal-Directed Autonomous Agents — Sub-goal generation",
  // Unit 7: Memory & State Management for Agents
  "Short-Term (Working) Memory — Conversation buffers",
  "Short-Term (Working) Memory — Context window management within a session",
  "Long-Term Memory — Episodic vs semantic memory",
  "Long-Term Memory — Persistent memory stores",
  "Memory Retrieval Strategies — Vector-based memory recall",
  "Memory Retrieval Strategies — Memory summarization & compression",
  "State Management — Tracking agent state across multi-step workflows",
  "State Management — Checkpointing",
  "Personalization — User profile memory",
  "Personalization — Preference learning over time",
  // Unit 8: Multi-Agent Systems & Orchestration Frameworks
  "Multi-Agent Design Patterns — Supervisor-worker",
  "Multi-Agent Design Patterns — Peer-to-peer",
  "Multi-Agent Design Patterns — Hierarchical agent teams",
  "Agent Communication Protocols — Message passing",
  "Agent Communication Protocols — Shared state",
  "Agent Communication Protocols — Agent-to-agent (A2A) communication",
  "Orchestration Frameworks — LangGraph",
  "Orchestration Frameworks — AutoGen",
  "Orchestration Frameworks — CrewAI",
  "Orchestration Frameworks — OpenAI Agents SDK",
  "Orchestration Frameworks — Semantic Kernel",
  "Workflow Orchestration — Sequential agent workflows",
  "Workflow Orchestration — Parallel agent workflows",
  "Workflow Orchestration — Conditional agent workflows",
  "Workflow Orchestration — Human-in-the-loop checkpoints",
  "Case Studies — Research agents",
  "Case Studies — Coding agents",
  "Case Studies — Customer-support agent teams",
  "Case Studies — Autonomous business workflows",
  // Unit 9: Agent Evaluation, Guardrails, Security & Observability
  "Evaluating Agents — Task success metrics",
  "Evaluating Agents — Trajectory evaluation",
  "Evaluating Agents — LLM-as-judge techniques",
  "Guardrails — Input/output validation",
  "Guardrails — Content filtering",
  "Guardrails — Action approval gates for high-risk operations",
  "Observability & Tracing — Logging agent traces",
  "Observability & Tracing — Debugging multi-step reasoning",
  "Observability & Tracing — Cost & latency tracking",
  "Agent Security — Prompt injection",
  "Agent Security — Tool misuse risks",
  "Agent Security — Excessive agency risks",
  "Agent Security — Sandboxing & permission scoping",
  "Responsible Agentic AI — Bias & transparency",
  "Responsible Agentic AI — Human oversight",
  "Responsible Agentic AI — Fail-safe design",
  // Unit 10: Deployment, Scaling, Ethics & Capstone
  "Deploying Agents — Serving agents as APIs with FastAPI",
  "Deploying Agents — Containerization with Docker",
  "Scaling & Reliability — Concurrency & rate limiting",
  "Scaling & Reliability — Retries/fallbacks",
  "Scaling & Reliability — Cost optimization at scale",
  "Cloud & Production Stack — AWS managed agent services",
  "Cloud & Production Stack — GCP managed agent services",
  "Cloud & Production Stack — Azure managed agent services",
  "Career Readiness — Resume & portfolio building for agentic AI roles",
  "Career Readiness — Interview preparation for agentic AI roles",
  "Capstone Project — End-to-end autonomous agent design",
  "Capstone Project — Multi-agent system implementation",
  "Capstone Project — Deployment & documentation"
];

function seedAgenticAISubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'Agentic AI');
  if (alreadyExists) return;
  const id = 'subj_agenticai_' + Date.now();
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  const topics = AGENTIC_AI_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'Agentic AI', color, topics });
  saveData('subjects');
}

// ===================== AI AUTOMATIONS & AI AGENTS SEED DATA =====================
const AI_AUTO_AGENT_TOPICS = [
  // Unit 1: Programming & Automation Foundations
  "Python for Automation — Scripting & data structures",
  "Python for Automation — Functions & working with files",
  "Python for Automation — Working with JSON & CSV",
  "Python for Automation — Scheduling scripts",
  "Version Control with Git — Git & GitHub fundamentals",
  "Version Control with Git — Branching",
  "Version Control with Git — Collaboration workflows for automation projects",
  "Working with APIs — REST principles & HTTP methods",
  "Working with APIs — Authentication: API keys & OAuth",
  "Working with APIs — Python requests/httpx libraries",
  "Webhooks & Triggers — Event-driven automation concepts",
  "Webhooks & Triggers — Polling vs webhooks",
  "Webhooks & Triggers — Scheduling with cron",
  "Environment & Tooling — Virtual environments & package management",
  "Environment & Tooling — IDE/notebook setup for automation development",
  // Unit 2: AI & LLM Foundations for Automation
  "AI/ML Foundations — What is AI/ML & types of learning",
  "AI/ML Foundations — Neural network basics (conceptual)",
  "LLM Architecture — Transformers & self-attention",
  "LLM Architecture — Tokens, embeddings & context window",
  "Model Families & Landscape — Open-source vs closed-source LLMs",
  "Model Families & Landscape — Model sizes, capabilities & limitations",
  "Inference & APIs — Calling LLM APIs: OpenAI & Anthropic",
  "Inference & APIs — Calling open-source LLMs via Hugging Face/Ollama",
  "Inference & APIs — Parameters: temperature, top-p, max tokens",
  "Limitations of Plain LLMs — Hallucination",
  "Limitations of Plain LLMs — Lack of memory & real-world action",
  // Unit 3: No-Code / Low-Code Automation Platforms
  "Automation Fundamentals — Triggers, actions, conditions & loops",
  "n8n — Self-hosted workflow automation & nodes",
  "n8n — Expressions & building multi-step AI-integrated workflows",
  "Zapier — App connectors & multi-step Zaps",
  "Zapier — Filters, formatter steps & error handling",
  "Make (Integromat) — Scenarios & multi-step automation",
  "Make (Integromat) — Filters, formatter & error handling",
  "AI Integrations in Platforms — Connecting LLM APIs inside no-code workflows",
  "AI Integrations in Platforms — AI-powered data transformation steps",
  "Real-World Automation Patterns — Lead capture & email/Slack notifications",
  "Real-World Automation Patterns — Data sync between apps",
  "Real-World Automation Patterns — Report generation pipelines",
  // Unit 4: Prompt & Context Engineering for Agents
  "Prompting Fundamentals — Zero-shot prompting",
  "Prompting Fundamentals — Few-shot prompting",
  "Prompting Fundamentals — Role-based prompting",
  "Advanced Prompting — Chain-of-Thought (CoT)",
  "Advanced Prompting — Self-Consistency",
  "Advanced Prompting — ReAct-style prompting",
  "Structured Output — JSON mode & schema-constrained generation",
  "Structured Output — Output parsing & validation",
  "Context Engineering — Context window management & compression",
  "Context Engineering — Relevance filtering for agents",
  "Prompt Management — Prompt templates, versioning & testing",
  // Unit 5: Tool Use, Function Calling & API Integration
  "Function/Tool Calling — Defining tool schemas",
  "Function/Tool Calling — Structured function calling in LLM APIs",
  "Building Custom Tools — Wrapping APIs as agent-usable tools",
  "Building Custom Tools — Wrapping databases as agent-usable tools",
  "Building Custom Tools — Code execution as agent-usable tools",
  "Tool Selection & Routing — How agents decide which tool to call",
  "Tool Selection & Routing — Multi-tool reasoning",
  "Model Context Protocol (MCP) — MCP servers and clients",
  "Code-Executing Agents — Sandboxed code interpreters",
  "Code-Executing Agents — Agents that write and run code",
  // Unit 6: Retrieval-Augmented Generation (RAG) for Agents
  "RAG Fundamentals — Why grounding matters & retrieval pipeline overview",
  "Document Processing — Chunking strategies & metadata",
  "Document Processing — Document loaders",
  "Vector Databases — Pinecone",
  "Vector Databases — ChromaDB",
  "Vector Databases — FAISS",
  "Vector Databases — Weaviate & indexing/similarity search",
  "Advanced Retrieval — Hybrid search & re-ranking",
  "Advanced Retrieval — Query expansion & rewriting",
  "Agentic RAG — Agents that decide when/what to retrieve",
  "Agentic RAG — Multi-hop retrieval reasoning",
  // Unit 7: Agent Reasoning, Frameworks & Orchestration
  "ReAct Pattern — Reasoning + Acting loops",
  "ReAct Pattern — Thought-action-observation cycles",
  "Plan-and-Execute Agents — Task decomposition & planning before acting",
  "Reflection & Self-Critique — Agents that evaluate & improve their own outputs",
  "Memory & State Management — Short-term memory & conversation buffers",
  "Memory & State Management — Long-term memory & vector-based recall",
  "Memory & State Management — Checkpointing",
  "Orchestration Frameworks — LangGraph",
  "Orchestration Frameworks — AutoGen",
  "Orchestration Frameworks — CrewAI",
  "Orchestration Frameworks — OpenAI Agents SDK",
  "Orchestration Frameworks — Semantic Kernel",
  // Unit 8: Multi-Agent Systems & Business Process Automation
  "Multi-Agent Design Patterns — Supervisor-worker",
  "Multi-Agent Design Patterns — Peer-to-peer",
  "Multi-Agent Design Patterns — Hierarchical agent teams",
  "Agent Communication Protocols — Message passing & shared state",
  "Agent Communication Protocols — Agent-to-agent (A2A) communication",
  "Workflow Orchestration — Sequential & parallel agent workflows",
  "Workflow Orchestration — Conditional workflows & human-in-the-loop checkpoints",
  "Combining No-Code & Agentic Layers — Triggering agent workflows from automation platforms",
  "Combining No-Code & Agentic Layers — Hybrid no-code + agent architectures",
  "Case Studies — Research agents",
  "Case Studies — Coding agents",
  "Case Studies — Customer-support agent teams",
  "Case Studies — Autonomous business workflows",
  // Unit 9: Deployment, Evaluation, Security, Ethics & Capstone
  "Deploying Agents & Automations — Serving agents as APIs with FastAPI",
  "Deploying Agents & Automations — Containerization with Docker",
  "Deploying Agents & Automations — Hosting n8n/automation workflows",
  "Evaluating Agents — Task success metrics & trajectory evaluation",
  "Evaluating Agents — LLM-as-judge techniques",
  "Agent & Automation Security — Prompt injection & tool misuse risks",
  "Agent & Automation Security — Sandboxing & permission scoping",
  "Responsible AI Automation — Bias, transparency & human oversight",
  "Responsible AI Automation — Fail-safe design & audit trails",
  "Capstone Project — End-to-end AI automation or multi-agent system",
  "Capstone Project — Deployment & documentation"
];

function seedAIAutoAgentSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'AI Automations & AI Agents');
  if (alreadyExists) return;
  const id = 'subj_aiauto_' + Date.now();
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  const topics = AI_AUTO_AGENT_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'AI Automations & AI Agents', color, topics });
  saveData('subjects');
}

// ===================== MLOPS ENGINEER SEED DATA =====================
const MLOPS_ENGINEER_TOPICS = [
  // Unit 1: Programming, Software Engineering & Linux Foundations
  "Python for MLOps — Scripting, OOP & packaging (pip/poetry)",
  "Python for MLOps — Virtual environments & writing production-grade code",
  "Software Engineering Practices — Code review & modular design",
  "Software Engineering Practices — Logging & configuration management",
  "Software Engineering Practices — Design patterns for ML systems",
  "Linux & Shell Scripting — File system, permissions & processes",
  "Linux & Shell Scripting — Bash scripting & cron jobs",
  "Linux & Shell Scripting — Environment variables",
  "Version Control with Git — Branching strategies & pull requests",
  "Version Control with Git — GitOps principles & collaboration workflows",
  "APIs & Networking Basics — REST principles, HTTP methods & JSON",
  "APIs & Networking Basics — Networking concepts (ports, DNS) for service deployment",
  // Unit 2: Machine Learning & Data Lifecycle Refresher
  "ML Workflow Recap — Supervised/unsupervised learning",
  "ML Workflow Recap — Train-validation-test splits & overfitting/underfitting",
  "Data Engineering Basics — Data pipelines & ETL/ELT concepts",
  "Data Engineering Basics — Data formats: Parquet, CSV, JSON",
  "Data Engineering Basics — Batch vs streaming data",
  "Feature Engineering & Feature Stores — Feature pipelines",
  "Feature Engineering & Feature Stores — Feast feature store",
  "Feature Engineering & Feature Stores — Feature versioning & reuse",
  "Model Evaluation Refresher — Metrics selection & validation strategies",
  "Model Evaluation Refresher — Baseline models & reproducibility",
  // Unit 3: Versioning Code, Data & Models
  "Data Version Control (DVC) — Versioning large datasets",
  "Data Version Control (DVC) — Linking data versions to Git commits",
  "Data Version Control (DVC) — Remote storage backends",
  "Model Versioning — Tracking model artifacts & semantic versioning",
  "Model Versioning — Model lineage",
  "Experiment Reproducibility — Seed management & environment capture",
  "Experiment Reproducibility — Deterministic pipelines",
  "Data & Model Governance — Dataset documentation & model cards",
  "Data & Model Governance — Data lineage tracking",
  // Unit 4: Model Packaging, APIs & Containerization
  "Model Serialization — Pickle & ONNX",
  "Model Serialization — TorchScript & SavedModel",
  "Building Model APIs — REST APIs with FastAPI & Flask",
  "Building Model APIs — Request validation & async serving",
  "Building Model APIs — Batch vs real-time inference",
  "Containerization with Docker — Writing Dockerfiles for ML services",
  "Containerization with Docker — Multi-stage builds & image optimization",
  "Containerization with Docker — GPU-enabled containers",
  "Container Orchestration Basics — Docker Compose for multi-service ML apps",
  "Container Orchestration Basics — Kubernetes concepts: pods, deployments, services",
  "Model Serving Frameworks — TorchServe & TensorFlow Serving",
  "Model Serving Frameworks — Triton Inference Server & BentoML",
  // Unit 5: CI/CD Pipelines for Machine Learning
  "CI/CD Fundamentals — CI vs CD vs Continuous Deployment for ML",
  "Pipeline Tools — GitHub Actions: writing pipeline config files",
  "Pipeline Tools — GitLab CI & Jenkins basics",
  "Testing ML Code — Unit tests for data, feature & model code",
  "Testing ML Code — Data validation tests",
  "Testing ML Code — Model performance regression tests",
  "Automated Build & Deploy — Automated image builds & container registries",
  "Automated Build & Deploy — Automated rollout strategies",
  "Continuous Training (CT) — Triggering retraining on new data/code changes",
  "Continuous Training (CT) — Automated model validation gates",
  // Unit 6: Experiment Tracking, Model Registry & Workflow Orchestration
  "Experiment Tracking — MLflow Tracking",
  "Experiment Tracking — Weights & Biases",
  "Experiment Tracking — Comparing runs & logging metrics/params/artifacts",
  "Model Registry — MLflow Model Registry",
  "Model Registry — Model staging: staging/production/archived",
  "Model Registry — Approval workflows",
  "Workflow Orchestration — Apache Airflow & DAG-based pipeline design",
  "Workflow Orchestration — Kubeflow Pipelines",
  "Workflow Orchestration — Prefect & Dagster",
  "Pipeline Design Patterns — Data validation, training, evaluation & deployment stages",
  "Feature & Metadata Stores — Centralizing feature pipelines for team-wide reuse",
  // Unit 7: Cloud Platforms & Infrastructure for ML
  "Cloud Fundamentals for ML — Compute (VMs/GPUs) & storage on AWS/GCP/Azure",
  "Cloud Fundamentals for ML — Networking basics for ML services",
  "Managed ML Platforms — Amazon SageMaker: training jobs & managed endpoints",
  "Managed ML Platforms — Google Vertex AI: pipelines & endpoints",
  "Managed ML Platforms — Azure ML: training & deployment",
  "Infrastructure as Code (IaC) — Terraform fundamentals",
  "Infrastructure as Code (IaC) — Provisioning ML infrastructure reproducibly",
  "Kubernetes for ML Workloads — Deploying ML services on Kubernetes",
  "Kubernetes for ML Workloads — Autoscaling (HPA) & GPU scheduling",
  "Kubernetes for ML Workloads — Kubeflow basics",
  "Cost & Resource Optimization — Spot/preemptible instances & autoscaling",
  "Cost & Resource Optimization — Right-sizing compute for training vs inference",
  // Unit 8: Model Monitoring, Observability & Retraining
  "Monitoring Fundamentals — Logging, metrics & tracing for ML services",
  "Monitoring Fundamentals — Infrastructure vs model-level monitoring",
  "Data & Model Drift Detection — Concept drift & data drift",
  "Data & Model Drift Detection — Statistical tests for distribution shift",
  "Data & Model Drift Detection — Drift dashboards",
  "Model Performance Monitoring — Online evaluation",
  "Model Performance Monitoring — Shadow deployments & canary releases",
  "Model Performance Monitoring — A/B testing for models",
  "Observability Tooling — Prometheus & Grafana",
  "Observability Tooling — Evidently AI",
  "Observability Tooling — ELK stack for ML observability",
  "Automated Retraining — Retraining policies based on drift/performance thresholds",
  "Automated Retraining — Human-in-the-loop review",
  // Unit 9: MLOps at Scale: Security, Governance, LLMOps & Capstone
  "ML System Security — Model/data access control & secrets management",
  "ML System Security — Supply-chain security for ML dependencies",
  "Responsible & Governed MLOps — Model cards & audit trails",
  "Responsible & Governed MLOps — Bias/fairness checks in pipelines",
  "Responsible & Governed MLOps — Regulatory considerations",
  "LLMOps Essentials — Prompt/version management & LLM evaluation pipelines",
  "LLMOps Essentials — RAG pipeline deployment & vector database ops",
  "LLMOps Essentials — Cost/latency monitoring for LLM APIs",
  "Career Readiness — Resume & portfolio building for MLOps roles",
  "Career Readiness — System design interview preparation for MLOps",
  "Capstone Project — Versioned data/model & containerized service",
  "Capstone Project — CI/CD automation & orchestrated training pipeline",
  "Capstone Project — Cloud deployment & monitoring dashboard"
];

// ===================== CORE COLLEGE SUBJECTS SEED DATA =====================
const COMPUTER_NETWORKS_TOPICS = [
  "Unit 1: Network Fundamentals & OSI vs TCP/IP Stack",
  "Unit 1: Physical Layer, Media & Transmission Signals",
  "Unit 1: Data Link Layer & Framing Protocols",
  "Unit 2: IP Addressing, IPv4/IPv6 & Subnetting",
  "Unit 2: Routing Algorithms (OSPF, BGP, RIP)",
  "Unit 3: Transport Layer (TCP, UDP, Flow & Congestion Control)",
  "Unit 4: Application Layer (HTTP/HTTPS, DNS, FTP, SMTP)",
  "Unit 5: Network Security, Cryptography & Firewalls"
];

const DBMS_TOPICS = [
  "Unit 1: ER Modeling, Entities, Attributes & Relational Model",
  "Unit 1: Relational Algebra & Relational Calculus",
  "Unit 2: SQL Queries, Aggregations, Joins & Views",
  "Unit 2: Functional Dependencies & Normalization (1NF to BCNF)",
  "Unit 3: Transaction Processing & ACID Properties",
  "Unit 4: Concurrency Control (Locking, Timestamping & Deadlocks)",
  "Unit 5: Indexing Techniques, B-Trees & NoSQL Databases"
];

const OPERATING_SYSTEMS_TOPICS = [
  "Unit 1: OS Architecture, Kernel Modes & System Calls",
  "Unit 1: Process Concept, PCB & Process State Transitions",
  "Unit 2: CPU Scheduling Algorithms (FCFS, SJF, Priority, RR)",
  "Unit 2: Process Synchronization, Semaphores & Mutex Locks",
  "Unit 3: Deadlocks Characterization, Prevention & Avoidance",
  "Unit 4: Memory Management, Paging, Segmentation & Virtual Memory",
  "Unit 5: File System Structure, Disk Scheduling (SCAN, C-LOOK)"
];

const SOFTWARE_ENG_TOPICS = [
  "Unit 1: Software Development Life Cycle (Waterfall, Agile, Scrum)",
  "Unit 1: Requirements Engineering & Use Case Modeling",
  "Unit 2: Object-Oriented Analysis & Design Patterns (SOLID)",
  "Unit 3: Software Architecture & Modular System Design",
  "Unit 4: Software Testing (Unit, Integration, System & Automation)",
  "Unit 5: CI/CD Pipelines, DevOps Basics & Software Maintenance"
];

function seedComputerNetworksSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'Computer Networks');
  if (alreadyExists) return;
  const id = 'subj_cn_' + Date.now();
  const color = '#38bdf8'; // Sky blue
  const topics = COMPUTER_NETWORKS_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'Computer Networks', color, topics, isCollege: true });
  saveData('subjects');
}

function seedDBMSSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'Database Management Systems (DBMS)');
  if (alreadyExists) return;
  const id = 'subj_dbms_' + Date.now();
  const color = '#a855f7'; // Purple
  const topics = DBMS_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'Database Management Systems (DBMS)', color, topics, isCollege: true });
  saveData('subjects');
}

function seedOSSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'Operating Systems');
  if (alreadyExists) return;
  const id = 'subj_os_' + Date.now();
  const color = '#2dd4a8'; // Emerald/Teal
  const topics = OPERATING_SYSTEMS_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'Operating Systems', color, topics, isCollege: true });
  saveData('subjects');
}

function seedSoftwareEngSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'Software Engineering & OO Design');
  if (alreadyExists) return;
  const id = 'subj_se_' + Date.now();
  const color = '#f59e0b'; // Amber/Gold
  const topics = SOFTWARE_ENG_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'Software Engineering & OO Design', color, topics, isCollege: true });
  saveData('subjects');
}

function seedCollegeSubjects() {
  seedComputerNetworksSubject();
  seedDBMSSubject();
  seedOSSubject();
  seedSoftwareEngSubject();
}

// ===================== DAILY SUBJECT STUDY MATRIX TABLE JS =====================

// ===================== DYNAMIC SUBJECT & MATRIX HANDLERS =====================

// ===================== DYNAMIC SUBJECT & MATRIX HANDLERS (V3 FIXED) =====================
function getMatrixVisibleSubjects() {
  // 1. Auto-register any missing subjects from completed sessions
  if (state.sessions && Array.isArray(state.sessions)) {
    state.sessions.filter(s => s.status === 'done').forEach(s => {
      const rawSubj = s.subjectId;
      if (!rawSubj) return;
      const exists = state.subjects.some(sub => sub.id === rawSubj || sub.name.toLowerCase() === String(rawSubj).toLowerCase());
      if (!exists) {
        const newId = 'subj_' + Date.now() + '_' + Math.floor(Math.random()*1000);
        const name = String(rawSubj).startsWith('subj_') ? 'General Subject' : String(rawSubj);
        const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
        state.subjects.push({ id: newId, name, color, topics: [] });
        saveData('subjects');
        s.subjectId = newId;
        saveData('sessions');
      }
    });
  }

  // 2. Get user explicitly hidden subjects set
  const hiddenList = S.get('los_matrix_hidden_cache') || [];
  const hiddenSet = new Set(hiddenList);

  // Return all subject IDs that are not explicitly hidden
  const visible = state.subjects.filter(s => {
    if (hiddenSet.has(s.id)) return false;
    // Default optional for tech AI/MLOps subjects if user hasn't saved custom selection
    if (!S.get('los_matrix_cols_cache') && !S.get('los_matrix_hidden_cache')) {
      const name = s.name.toLowerCase();
      if (name.includes('agentic') || name.includes('mlops') || name.includes('ai engineer') || name.includes('automation agent')) {
        return false;
      }
    }
    return true;
  }).map(s => s.id);

  return visible.length > 0 ? visible : state.subjects.map(s => s.id);
}

function matchSessionToSubject(sess, subj) {
  if (!sess || !subj) return false;
  const sid = String(sess.subjectId || '').trim().toLowerCase();
  const subId = String(subj.id || '').trim().toLowerCase();
  const subName = String(subj.name || '').trim().toLowerCase();
  return sid === subId || sid === subName;
}

function normalizeDateKey(rawDate) {
  if (!rawDate) return '';
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate).substring(0, 10);
    return toDateKey(d);
  } catch(e) {
    return String(rawDate).substring(0, 10);
  }
}

function formatMatrixDuration(ms) {
  if (!ms || ms <= 0) return '—';
  if (ms < 60000) return '< 1m';
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function renderDailyStudyMatrix() {
  const headEl = document.getElementById('matrix-table-head');
  const bodyEl = document.getElementById('matrix-table-body');
  const footEl = document.getElementById('matrix-table-foot');
  if (!headEl || !bodyEl || !footEl) return;

  const visibleIds = getMatrixVisibleSubjects();
  const visibleSubjs = state.subjects.filter(s => visibleIds.includes(s.id));

  // Update stat active column count
  const statCols = document.getElementById('matrix-stat-cols');
  if (statCols) statCols.textContent = `${visibleSubjs.length} Active Column${visibleSubjs.length !== 1 ? 's' : ''}`;

  // 1. Render Table Headers
  let headHtml = `<th>Date</th>`;
  visibleSubjs.forEach(s => {
    const c = colorForSubject(s);
    headHtml += `<th style="color:${c};">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${c};display:inline-block;"></span>
        <span>${escHtml(s.name)}</span>
      </div>
    </th>`;
  });
  headHtml += `<th>Total Time</th><th>Action</th>`;
  headEl.innerHTML = headHtml;

  // 2. Gather Dates Range
  const rangeVal = document.getElementById('matrix-range-select') ? document.getElementById('matrix-range-select').value : '7';
  let dates = [];
  const todayKey = toDateKey(new Date());

  if (rangeVal === '1') {
    dates = [todayKey];
  } else if (rangeVal === 'all') {
    const sessionDates = state.sessions.filter(s => s.status === 'done').map(s => normalizeDateKey(s.date));
    const dateSet = new Set([todayKey, ...sessionDates]);
    dates = Array.from(dateSet).sort().reverse();
  } else {
    const numDays = parseInt(rangeVal, 10) || 7;
    for (let i = 0; i < numDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(toDateKey(d));
    }
  }

  if (visibleSubjs.length === 0) {
    bodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--muted);">No subjects visible. Click <strong>"⚙️ Manage Columns"</strong> above to enable subject columns.</td></tr>`;
    footEl.innerHTML = '';
    return;
  }

  // 3. Aggregate Study Data by Date & Subject ID
  const dataByDate = {};
  state.sessions.filter(s => s.status === 'done').forEach(s => {
    const dKey = normalizeDateKey(s.date);
    if (!dKey) return;
    if (!dataByDate[dKey]) dataByDate[dKey] = {};
    
    visibleSubjs.forEach(subj => {
      if (matchSessionToSubject(s, subj)) {
        if (!dataByDate[dKey][subj.id]) dataByDate[dKey][subj.id] = 0;
        dataByDate[dKey][subj.id] += (s.duration || 0);
      }
    });
  });

  const subjectTotals = {};
  visibleSubjs.forEach(s => subjectTotals[s.id] = 0);
  let grandTotalTodayMs = 0;
  const todaySubjectMsMap = {};

  // 4. Build Table Rows
  let bodyHtml = '';
  dates.forEach(dateStr => {
    const isToday = (dateStr === todayKey);
    let rowTotalMs = 0;
    let rowCellsHtml = '';

    visibleSubjs.forEach(s => {
      const ms = (dataByDate[dateStr] && dataByDate[dateStr][s.id]) ? dataByDate[dateStr][s.id] : 0;
      subjectTotals[s.id] += ms;
      rowTotalMs += ms;

      if (isToday) {
        grandTotalTodayMs += ms;
        todaySubjectMsMap[s.id] = (todaySubjectMsMap[s.id] || 0) + ms;
      }

      const c = colorForSubject(s);
      if (ms > 0) {
        rowCellsHtml += `<td>
          <span class="matrix-cell-badge" style="background:${c}18;color:${c};border:1px solid ${c}33;" onclick="openQuickLogModal('${dateStr}', '${s.id}')" title="Click to edit or log time">
            ⏱️ ${formatMatrixDuration(ms)}
          </span>
        </td>`;
      } else {
        rowCellsHtml += `<td><span class="matrix-cell-empty" onclick="openQuickLogModal('${dateStr}', '${s.id}')" style="cursor:pointer;" title="Click to log time">—</span></td>`;
      }
    });

    bodyHtml += `<tr>
      <td>
        <div class="matrix-date-cell">
          <span>${formatDateFriendly(dateStr)}</span>
          ${isToday ? '<span class="matrix-date-today">TODAY</span>' : ''}
        </div>
      </td>
      ${rowCellsHtml}
      <td><span class="matrix-row-total">${formatMatrixDuration(rowTotalMs)}</span></td>
      <td>
        <button class="btn-matrix-action btn-matrix-outline" style="font-size:0.72rem;padding:3px 8px;" onclick="openQuickLogModal('${dateStr}')">✏️ Log</button>
      </td>
    </tr>`;
  });

  bodyEl.innerHTML = bodyHtml;

  // 5. Build Footer Row
  let footHtml = `<tr><td><strong>Total Study Time</strong></td>`;
  let grandTotalRangeMs = 0;
  visibleSubjs.forEach(s => {
    const totMs = subjectTotals[s.id] || 0;
    grandTotalRangeMs += totMs;
    const c = colorForSubject(s);
    footHtml += `<td style="color:${c};font-weight:700;">${totMs > 0 ? formatMatrixDuration(totMs) : '0m'}</td>`;
  });
  footHtml += `<td style="color:var(--accent);font-weight:800;">${formatMatrixDuration(grandTotalRangeMs)}</td><td>—</td></tr>`;
  footEl.innerHTML = footHtml;

  // 6. Update Stats Bar
  const statToday = document.getElementById('matrix-stat-today');
  if (statToday) statToday.textContent = formatMatrixDuration(grandTotalTodayMs);

  const statTop = document.getElementById('matrix-stat-top');
  if (statTop) {
    let topSubjId = null, maxMs = 0;
    Object.entries(todaySubjectMsMap).forEach(([sId, ms]) => {
      if (ms > maxMs) { maxMs = ms; topSubjId = sId; }
    });
    if (topSubjId && maxMs > 0) {
      const topS = state.subjects.find(s => s.id === topSubjId);
      statTop.textContent = `${topS ? topS.name : 'Subject'} (${formatMatrixDuration(maxMs)})`;
    } else {
      statTop.textContent = 'None yet today';
    }
  }
}

function exportMatrixCSV() {
  const visibleIds = getMatrixVisibleSubjects();
  const visibleSubjs = state.subjects.filter(s => visibleIds.includes(s.id));
  if (visibleSubjs.length === 0) { showToast('No visible subjects to export', 'warn'); return; }

  const rangeVal = document.getElementById('matrix-range-select') ? document.getElementById('matrix-range-select').value : '7';
  let dates = [];
  const todayKey = toDateKey(new Date());

  if (rangeVal === '1') {
    dates = [todayKey];
  } else if (rangeVal === 'all') {
    const sessionDates = state.sessions.filter(s => s.status === 'done').map(s => normalizeDateKey(s.date));
    dates = Array.from(new Set([todayKey, ...sessionDates])).sort().reverse();
  } else {
    const numDays = parseInt(rangeVal, 10) || 7;
    for (let i = 0; i < numDays; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(toDateKey(d));
    }
  }

  const dataByDate = {};
  state.sessions.filter(s => s.status === 'done').forEach(s => {
    const dKey = normalizeDateKey(s.date);
    if (!dKey) return;
    if (!dataByDate[dKey]) dataByDate[dKey] = {};
    visibleSubjs.forEach(subj => {
      if (matchSessionToSubject(s, subj)) {
        if (!dataByDate[dKey][subj.id]) dataByDate[dKey][subj.id] = 0;
        dataByDate[dKey][subj.id] += (s.duration || 0);
      }
    });
  });

  const headers = ['Date', ...visibleSubjs.map(s => `"${s.name.replace(/"/g, '""')}"`), 'Total Study Time (Mins)'];
  const csvRows = [headers.join(',')];

  dates.forEach(dStr => {
    let rowTotalMs = 0;
    const rowCells = [dStr];
    visibleSubjs.forEach(s => {
      const ms = (dataByDate[dStr] && dataByDate[dStr][s.id]) ? dataByDate[dStr][s.id] : 0;
      rowTotalMs += ms;
      const mins = Math.round(ms / 60000);
      rowCells.push(mins);
    });
    rowCells.push(Math.round(rowTotalMs / 60000));
    csvRows.push(rowCells.join(','));
  });

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `daily_study_matrix_${todayKey}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Daily Subject Matrix CSV exported!', 'success');
}

function addSubject(forcedName) {
  let name = forcedName ? String(forcedName).trim() : '';
  const input = document.getElementById('new-subject-input');
  const matrixInput = document.getElementById('matrix-new-subject-name');
  const grp = document.getElementById('matrix-new-subject-group');

  if (!name && input) name = input.value.trim();
  if (!name && matrixInput && grp && grp.style.display !== 'none') name = matrixInput.value.trim();
  if (!name && !input) name = (window.prompt('Enter subject name:') || '').trim();
  if (!name) return null;
  if (state.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast('Subject already exists', 'warn');
    return state.subjects.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
  }
  const id = 'subj_' + Date.now();
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  const subject = { id, name, color, topics: [] };
  state.subjects.push(subject);
  saveData('subjects');
  if (input) input.value = '';
  if (matrixInput) matrixInput.value = '';
  renderSubjects();
  renderTaskSubjectFilter();
  try { renderDailyStudyMatrix(); } catch(e) {}
  try { renderDashboard(); } catch(e) {}
  showToast(`Subject "${name}" added`, 'success');
  return subject;
}

function populateMatrixLogSubjects(selectedId) {
  const sel = document.getElementById('matrix-log-subject');
  if (!sel) return;
  const opts = state.subjects.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');
  sel.innerHTML = opts + '<option value="__new__">➕ Add New Subject…</option>';
  if (selectedId && (selectedId === '__new__' || state.subjects.some(s => s.id === selectedId))) {
    sel.value = selectedId;
  }
  handleLogSubjectChange();
}

function openQuickLogModal(dateStr, subjectId) {
  const dateEl = document.getElementById('matrix-log-date');
  const minsEl = document.getElementById('matrix-log-minutes');
  const noteEl = document.getElementById('matrix-log-note');
  if (dateEl) dateEl.value = dateStr || toDateKey(new Date());
  if (minsEl) minsEl.value = '';
  if (noteEl) noteEl.value = '';
  populateMatrixLogSubjects(subjectId || '');
  openModal('modal-matrix-log');
}

function handleLogSubjectChange() {
  const sel = document.getElementById('matrix-log-subject');
  const grp = document.getElementById('matrix-new-subject-group');
  if (!sel || !grp) return;
  grp.style.display = sel.value === '__new__' ? 'block' : 'none';
}

function saveQuickLogSession() {
  const date = document.getElementById('matrix-log-date')?.value;
  const mins = parseInt(document.getElementById('matrix-log-minutes')?.value, 10);
  const note = (document.getElementById('matrix-log-note')?.value || '').trim();
  const selVal = document.getElementById('matrix-log-subject')?.value;

  if (!date) { showToast('Pick a date', 'error'); return; }
  if (!mins || mins < 1) { showToast('Enter study duration in minutes', 'error'); return; }

  let subjectId = selVal;
  if (selVal === '__new__') {
    const newName = (document.getElementById('matrix-new-subject-name')?.value || '').trim();
    if (!newName) { showToast('Enter a name for the new subject', 'error'); return; }
    const created = addSubject(newName);
    if (!created) return;
    subjectId = created.id;
  } else if (!subjectId) {
    showToast('Select a subject', 'error');
    return;
  }

  state.sessions.push({
    id: 'sess_' + Date.now(),
    date,
    subjectId,
    taskName: note || 'Manual log',
    duration: mins * 60000,
    status: 'done'
  });
  saveData('sessions');
  closeModal('modal-matrix-log');
  renderDailyStudyMatrix();
  try { renderDashboard(); } catch(e) {}
  try { renderSessions(); } catch(e) {}
  showToast('Study time logged!', 'success');
}

function openSubjectColumnModal() {
  const list = document.getElementById('matrix-columns-list');
  if (!list) return;
  const visibleIds = getMatrixVisibleSubjects();
  const visibleSet = new Set(visibleIds);
  if (state.subjects.length === 0) {
    list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;padding:8px 0;">No subjects yet — add one first</div>';
  } else {
    list.innerHTML = state.subjects.map(s => {
      const c = colorForSubject(s);
      const checked = visibleSet.has(s.id) ? 'checked' : '';
      const typeLabel = s.isCollege ? 'College' : 'Custom';
      return `<label class="matrix-col-checkbox-card">
        <input type="checkbox" data-subject-id="${s.id}" ${checked}>
        <span class="matrix-col-name" style="color:${c};">${escHtml(s.name)}</span>
        <span class="matrix-col-type">${typeLabel}</span>
      </label>`;
    }).join('');
  }
  openModal('modal-matrix-columns');
}

function selectColumnPreset(preset) {
  const list = document.getElementById('matrix-columns-list');
  if (!list) return;
  list.querySelectorAll('input[type=checkbox]').forEach(cb => {
    const subj = state.subjects.find(s => s.id === cb.dataset.subjectId);
    if (preset === 'all') cb.checked = true;
    else if (preset === 'none') cb.checked = false;
    else if (preset === 'college') cb.checked = !!(subj && subj.isCollege);
  });
}

function saveSubjectColumnSelection() {
  const list = document.getElementById('matrix-columns-list');
  if (!list) return;
  const hidden = [];
  list.querySelectorAll('input[type=checkbox]').forEach(cb => {
    if (!cb.checked) hidden.push(cb.dataset.subjectId);
  });
  S.set('los_matrix_hidden_cache', hidden);
  S.set('los_matrix_cols_cache', true);
  state.matrixVisibleSubjects = state.subjects.filter(s => !hidden.includes(s.id)).map(s => s.id);
  closeModal('modal-matrix-columns');
  renderDailyStudyMatrix();
  showToast('Dashboard columns updated', 'success');
}

function seedMLOpsEngineerSubject() {
  const alreadyExists = state.subjects.some(s => s.name === 'MLOps Engineer');
  if (alreadyExists) return;
  const id = 'subj_mlops_' + Date.now();
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  const topics = MLOPS_ENGINEER_TOPICS.map(name => ({ name, done: false }));
  state.subjects.push({ id, name: 'MLOps Engineer', color, topics });
  saveData('subjects');
}


// ╔══════════════════════════════════════════════════════════════════╗
// ║         FRIENDS SYSTEM — Firestore-backed                       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── State ────────────────────────────────────────────────────────
let _friendsList        = [];   // accepted friends
let _pendingRequests    = [];   // incoming requests for me
let _sentRequests       = [];   // requests I sent
let _friendMessages     = [];   // all messages (sent + received)
let _friendsUnsubscribe = null; // Firestore listener cleanup

// ── Init (called when Friends page opens) ────────────────────────
async function initFriends() {
  if (!window._db || !window._fbUid) return;
  await Promise.all([
    loadFriendsList(),
    loadFriendRequests(),
    loadFriendMessages(),
  ]);
  renderFriendsPage();
}

// ── Load friends list ─────────────────────────────────────────────
async function loadFriendsList() {
  try {
    const snap = await window._db
      .collection('friends').doc(window._fbUid)
      .collection('list').get();
    _friendsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.warn('loadFriendsList:', e); }
}

// ── Load friend requests ──────────────────────────────────────────
async function loadFriendRequests() {
  try {
    // Incoming requests (to me)
    const inSnap = await window._db.collection('friendRequests')
      .where('toUid', '==', window._fbUid)
      .where('status', '==', 'pending')
      .get();
    _pendingRequests = inSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sent requests (from me)
    const outSnap = await window._db.collection('friendRequests')
      .where('fromUid', '==', window._fbUid)
      .where('status', '==', 'pending')
      .get();
    _sentRequests = outSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.warn('loadFriendRequests:', e); }
}

// ── Load messages ─────────────────────────────────────────────────
async function loadFriendMessages() {
  try {
    const [sentSnap, recvSnap] = await Promise.all([
      window._db.collection('friendMessages')
        .where('fromUid', '==', window._fbUid).get(),
      window._db.collection('friendMessages')
        .where('toUid', '==', window._fbUid).get(),
    ]);
    const sent = sentSnap.docs.map(d => ({ id: d.id, dir: 'sent', ...d.data() }));
    const recv = recvSnap.docs.map(d => ({ id: d.id, dir: 'received', ...d.data() }));
    _friendMessages = [...sent, ...recv].sort((a,b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
  } catch(e) { console.warn('loadFriendMessages:', e); }
}

// ── Render everything ─────────────────────────────────────────────
function renderFriendsPage() {
  // Count
  const countEl = document.getElementById('friends-total-count');
  if (countEl) countEl.textContent = _friendsList.length;

  // Badge on nav
  const badge = document.getElementById('friends-nav-badge');
  if (badge) {
    if (_pendingRequests.length > 0) {
      badge.textContent = _pendingRequests.length;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }

  // Request badge button
  const reqBadge = document.getElementById('requests-badge');
  if (reqBadge) {
    if (_pendingRequests.length > 0) {
      reqBadge.textContent = _pendingRequests.length;
      reqBadge.style.display = 'inline';
    } else {
      reqBadge.style.display = 'none';
    }
  }

  // Friend select dropdown
  const sel = document.getElementById('share-friend-select');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">— Select a friend —</option>' +
      _friendsList.map(f => `<option value="${f.uid}">${escHtml(f.name)} (${escHtml(f.email)})</option>`).join('');
    if (cur) sel.value = cur;
  }

  // Sent messages
  renderFriendMessageList('friends-sent-list', 'sent');

  // Received messages
  renderFriendMessageList('friends-received-list', 'received');
}

function renderFriendMessageList(containerId, dir) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const msgs = _friendMessages.filter(m => m.dir === dir);
  if (msgs.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;text-align:center;padding:20px 0;">
      ${dir === 'sent' ? 'Nothing sent yet' : 'Nothing received yet'}</div>`;
    return;
  }
  el.innerHTML = msgs.slice(0, 30).map(m => {
    const isPrompt = m.type === 'prompt';
    const isImage  = m.type === 'image';
    const isPDF    = m.type === 'pdf';
    const badgeCls = isPrompt ? 'badge-prompt' : isImage ? 'badge-image' : 'badge-pdf';
    const badgeIcon= isPrompt ? '📋 Prompt' : isImage ? '🖼️ Image' : '📄 PDF';
    const preview  = isPrompt ? (m.content || '').slice(0, 80) : (m.fileName || 'File');
    const peer     = dir === 'sent'
      ? `To: <b>${escHtml(m.toName || m.toEmail || '?')}</b>`
      : `From: <b>${escHtml(m.fromName || m.fromEmail || '?')}</b>`;
    const ts = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : '';
    return `<div class="share-msg-card" onclick="viewSharedContent('${m.id}')">
      <div class="share-msg-meta">${peer} &nbsp;·&nbsp; ${escHtml(ts)}</div>
      <span class="share-type-badge ${badgeCls}">${badgeIcon}</span>
      <div class="share-msg-preview">${escHtml(preview)}</div>
    </div>`;
  }).join('');
}

// ── Add Friend Modal ──────────────────────────────────────────────
function openAddFriendModal() {
  document.getElementById('add-friend-email').value = '';
  document.getElementById('add-friend-msg').textContent = '';
  openModal('modal-add-friend');
}

async function sendFriendRequest() {
  const email = document.getElementById('add-friend-email').value.trim().toLowerCase();
  const msgEl = document.getElementById('add-friend-msg');
  if (!email) { msgEl.style.color='#ef4444'; msgEl.textContent='Please enter an email.'; return; }
  if (email === window._auth.currentUser?.email?.toLowerCase()) {
    msgEl.style.color='#ef4444'; msgEl.textContent="You can't add yourself!"; return;
  }

  // Check already friends
  if (_friendsList.some(f => f.email?.toLowerCase() === email)) {
    msgEl.style.color='#f59e0b'; msgEl.textContent='Already friends with this person.'; return;
  }

  // Check already sent
  if (_sentRequests.some(r => r.toEmail?.toLowerCase() === email)) {
    msgEl.style.color='#f59e0b'; msgEl.textContent='Request already sent to this email.'; return;
  }

  msgEl.style.color='var(--muted)'; msgEl.textContent='Sending…';

  try {
    // Find the user by email in Firestore users collection
    const usersSnap = await window._db.collection('users')
      .where('email', '==', email).get();

    if (usersSnap.empty) {
      msgEl.style.color='#ef4444';
      msgEl.textContent='No LearnOS account found with that email.';
      return;
    }

    const targetDoc = usersSnap.docs[0];
    const targetUid = targetDoc.id;
    const targetData = targetDoc.data();
    const myEmail = window._auth.currentUser.email;
    const myName  = window._fbDisplayName || myEmail.split('@')[0];

    // Create friend request in Firestore
    await window._db.collection('friendRequests').add({
      fromUid:   window._fbUid,
      fromEmail: myEmail,
      fromName:  myName,
      toUid:     targetUid,
      toEmail:   email,
      toName:    targetData.displayName || email.split('@')[0],
      status:    'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    msgEl.style.color='#22c55e';
    msgEl.textContent = `✅ Request sent to ${targetData.displayName || email}!`;
    await loadFriendRequests();
    renderFriendsPage();
    setTimeout(() => closeModal('modal-add-friend'), 1800);
  } catch(e) {
    console.error(e);
    msgEl.style.color='#ef4444';
    msgEl.textContent='Error sending request. Try again.';
  }
}

// ── Requests Modal ────────────────────────────────────────────────
async function openRequestsModal() {
  await loadFriendRequests();
  const el = document.getElementById('requests-list');
  if (_pendingRequests.length === 0) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:20px;">No pending requests</div>';
  } else {
    el.innerHTML = _pendingRequests.map(r => `
      <div class="friend-item">
        <div class="friend-avatar">${(r.fromName||'?')[0].toUpperCase()}</div>
        <div class="friend-info">
          <div class="friend-name">${escHtml(r.fromName || '?')}</div>
          <div class="friend-email">${escHtml(r.fromEmail || '')}</div>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">Wants to be your friend</div>
        </div>
        <div class="friend-actions">
          <button class="btn-accept" onclick="acceptFriendRequest('${r.id}','${r.fromUid}','${escHtml(r.fromName||'')}','${escHtml(r.fromEmail||'')}')">✅ Accept</button>
          <button class="btn-decline" onclick="declineFriendRequest('${r.id}')">❌</button>
        </div>
      </div>`).join('');
  }
  openModal('modal-friend-requests');
}

async function acceptFriendRequest(reqId, fromUid, fromName, fromEmail) {
  try {
    const myEmail = window._auth.currentUser.email;
    const myName  = window._fbDisplayName || myEmail.split('@')[0];

    // Update request status
    await window._db.collection('friendRequests').doc(reqId).update({ status: 'accepted' });

    // Add to both users' friend lists
    const batch = window._db.batch();
    batch.set(
      window._db.collection('friends').doc(window._fbUid).collection('list').doc(fromUid),
      { uid: fromUid, name: fromName, email: fromEmail, addedAt: firebase.firestore.FieldValue.serverTimestamp() }
    );
    batch.set(
      window._db.collection('friends').doc(fromUid).collection('list').doc(window._fbUid),
      { uid: window._fbUid, name: myName, email: myEmail, addedAt: firebase.firestore.FieldValue.serverTimestamp() }
    );
    await batch.commit();

    showToast(`🎉 You and ${fromName} are now friends!`, 'success');
    await loadFriendsList();
    await loadFriendRequests();
    renderFriendsPage();
    closeModal('modal-friend-requests');
  } catch(e) {
    console.error(e);
    showToast('Error accepting request. Try again.', '');
  }
}

async function declineFriendRequest(reqId) {
  try {
    await window._db.collection('friendRequests').doc(reqId).update({ status: 'declined' });
    showToast('Request declined.', '');
    await loadFriendRequests();
    renderFriendsPage();
    closeModal('modal-friend-requests');
  } catch(e) { showToast('Error. Try again.', ''); }
}

// ── Friends List Popup ────────────────────────────────────────────
async function openFriendsListPopup() {
  await loadFriendsList();
  const el = document.getElementById('friends-full-list');
  if (_friendsList.length === 0) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:20px;">No friends yet — add some!</div>';
  } else {
    el.innerHTML = _friendsList.map(f => `
      <div class="friend-item">
        <div class="friend-avatar">${(f.name||'?')[0].toUpperCase()}</div>
        <div class="friend-info">
          <div class="friend-name">${escHtml(f.name||'?')}</div>
          <div class="friend-email">${escHtml(f.email||'')}</div>
        </div>
        <button class="btn-unfriend" onclick="unfriend('${f.uid}','${escHtml(f.name||'')}')">Remove</button>
      </div>`).join('');
  }
  openModal('modal-friends-list');
}

async function unfriend(uid, name) {
  if (!confirm(`Remove ${name} from friends?`)) return;
  try {
    await window._db.collection('friends').doc(window._fbUid).collection('list').doc(uid).delete();
    await window._db.collection('friends').doc(uid).collection('list').doc(window._fbUid).delete();
    showToast(`Removed ${name} from friends.`, '');
    await loadFriendsList();
    renderFriendsPage();
    closeModal('modal-friends-list');
  } catch(e) { showToast('Error. Try again.', ''); }
}

// ── Send Prompt/File to Friend ────────────────────────────────────
let _shareFileData = null;
let _shareFileType = null;
let _shareFileName = null;

function previewShareFile(input) {
  const file = input.files[0];
  const preview = document.getElementById('share-file-preview');
  if (!file) { _shareFileData = null; preview.textContent = ''; return; }
  _shareFileName = file.name;
  _shareFileType = file.type.startsWith('image/') ? 'image' : 'pdf';
  preview.textContent = `📎 ${file.name}`;

  const reader = new FileReader();
  reader.onload = e => { _shareFileData = e.target.result; };
  reader.readAsDataURL(file);
}

async function sendToFriend() {
  const toUid = document.getElementById('share-friend-select').value;
  const text  = document.getElementById('share-prompt-text').value.trim();

  if (!toUid) { showToast('Please select a friend.', ''); return; }
  if (!text && !_shareFileData) { showToast('Enter a message or attach a file.', ''); return; }

  const friend = _friendsList.find(f => f.uid === toUid);
  if (!friend) return;

  const myEmail = window._auth.currentUser.email;
  const myName  = window._fbDisplayName || myEmail.split('@')[0];

  showToast('Sending…', '');

  try {
    const msgData = {
      fromUid:   window._fbUid,
      fromEmail: myEmail,
      fromName:  myName,
      toUid:     toUid,
      toEmail:   friend.email,
      toName:    friend.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      read:      false,
    };

    if (_shareFileData) {
      // Store file as base64 in Firestore (small files only — up to ~900KB)
      msgData.type     = _shareFileType;
      msgData.fileName = _shareFileName;
      msgData.fileData = _shareFileData;
      msgData.content  = text || '';
    } else {
      msgData.type    = 'prompt';
      msgData.content = text;
    }

    await window._db.collection('friendMessages').add(msgData);

    // Reset form
    document.getElementById('share-prompt-text').value = '';
    document.getElementById('share-file-input').value = '';
    document.getElementById('share-file-preview').textContent = '';
    _shareFileData = null; _shareFileType = null; _shareFileName = null;

    showToast(`✅ Sent to ${friend.name}!`, 'success');
    await loadFriendMessages();
    renderFriendsPage();
  } catch(e) {
    console.error(e);
    showToast('Error sending. Try again.', '');
  }
}

// ── View Shared Content Popup ─────────────────────────────────────
function viewSharedContent(msgId) {
  const msg = _friendMessages.find(m => m.id === msgId);
  if (!msg) return;

  const titleEl  = document.getElementById('content-view-title');
  const bodyEl   = document.getElementById('content-view-body');
  const footerEl = document.getElementById('content-view-footer');

  const peer = msg.dir === 'sent'
    ? `To: ${msg.toName || msg.toEmail}`
    : `From: ${msg.fromName || msg.fromEmail}`;
  const ts = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : '';

  if (msg.type === 'prompt') {
    titleEl.textContent = '📋 Prompt';
    bodyEl.innerHTML = `
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:10px;">${escHtml(peer)} · ${escHtml(ts)}</div>
      <div style="background:var(--bg3);border-radius:10px;padding:14px;font-size:0.88rem;line-height:1.6;white-space:pre-wrap;">${escHtml(msg.content||'')}</div>`;
    footerEl.innerHTML = `
      <button class="btn-secondary" onclick="closeModal('modal-content-view')">Close</button>
      <button class="btn-primary" onclick="navigator.clipboard.writeText(${JSON.stringify(msg.content||'')}).then(()=>showToast('Copied!','success'))">📋 Copy Prompt</button>`;

  } else if (msg.type === 'image') {
    titleEl.textContent = '🖼️ Image';
    bodyEl.innerHTML = `
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:10px;">${escHtml(peer)} · ${escHtml(ts)}</div>
      <img src="${msg.fileData}" alt="${escHtml(msg.fileName||'image')}" style="max-width:100%;border-radius:10px;display:block;margin:0 auto;">`;
    footerEl.innerHTML = `
      <button class="btn-secondary" onclick="closeModal('modal-content-view')">Close</button>
      <a href="${msg.fileData}" download="${escHtml(msg.fileName||'image')}" class="btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">⬇️ Download</a>`;

  } else if (msg.type === 'pdf') {
    titleEl.textContent = '📄 PDF';
    bodyEl.innerHTML = `
      <div style="font-size:0.75rem;color:var(--muted);margin-bottom:10px;">${escHtml(peer)} · ${escHtml(ts)}</div>
      <div style="background:var(--bg3);border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:8px;">📄</div>
        <div style="font-size:0.9rem;font-weight:600;">${escHtml(msg.fileName||'document.pdf')}</div>
      </div>`;
    footerEl.innerHTML = `
      <button class="btn-secondary" onclick="closeModal('modal-content-view')">Close</button>
      <a href="${msg.fileData}" download="${escHtml(msg.fileName||'document.pdf')}" class="btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">⬇️ Download PDF</a>
      <button class="btn-primary" onclick="window.open('${msg.fileData}','_blank')">👁️ Open</button>`;
  }

  openModal('modal-content-view');
}

// ── Wire navTo for friends ────────────────────────────────────────
// (appended to existing navTo via render call — see navTo patch below)

// ── Check friend requests on login (show badge) ──────────────────
async function checkFriendRequestsOnLogin() {
  if (!window._db || !window._fbUid) return;
  try {
    const snap = await window._db.collection('friendRequests')
      .where('toUid', '==', window._fbUid)
      .where('status', '==', 'pending')
      .get();
    const count = snap.docs.length;
    _pendingRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const badge = document.getElementById('friends-nav-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline';
        showToast(`🤝 You have ${count} friend request${count > 1 ? 's' : ''}!`, 'success');
      } else {
        badge.style.display = 'none';
      }
    }
  } catch(e) { console.warn('checkFriendRequestsOnLogin:', e); }
}


// ╔══════════════════════════════════════════════════════════════════╗
// ║         GAMIFICATION ENGINE — XP, Levels, Trophies             ║
// ╚══════════════════════════════════════════════════════════════════╝

const GAM_LEVELS = [
  { level:1,  xp:0,    title:'Beginner',    badge:'🌱' },
  { level:2,  xp:100,  title:'Explorer',    badge:'🧭' },
  { level:3,  xp:300,  title:'Learner',     badge:'📚' },
  { level:4,  xp:600,  title:'Achiever',    badge:'⚡' },
  { level:5,  xp:1000, title:'Scholar',     badge:'🎓' },
  { level:6,  xp:1500, title:'Expert',      badge:'💡' },
  { level:7,  xp:2200, title:'Master',      badge:'🔮' },
  { level:8,  xp:3000, title:'Champion',    badge:'🏆' },
  { level:9,  xp:4000, title:'Legend',      badge:'⚔️'  },
  { level:10, xp:5500, title:'Grandmaster', badge:'👑' },
];

const GAM_TROPHIES = [
  { id:'first_step',     icon:'🌱', name:'First Step',     desc:'First login ever' },
  { id:'streak_3',       icon:'✨', name:'Ignition',       desc:'3-day study streak' },
  { id:'on_fire',        icon:'🔥', name:'On Fire',        desc:'7-day study streak' },
  { id:'diamond_mind',   icon:'💎', name:'Diamond Mind',   desc:'30-day study streak' },
  { id:'half_century',   icon:'🥈', name:'Half Century',   desc:'Complete 50 topics total' },
  { id:'century',        icon:'💯', name:'Century',        desc:'Complete 100 topics total' },
  { id:'speed_learner',  icon:'⚡', name:'Speed Learner',  desc:'10 topics in one day' },
  { id:'subject_master', icon:'👑', name:'Subject Master', desc:'All topics in one subject done' },
  { id:'focused',        icon:'🎯', name:'Focused',        desc:'5 sessions in one week' },
  { id:'early_bird',     icon:'🌅', name:'Early Bird',     desc:'Login before 7 AM' },
  { id:'night_owl',      icon:'🦉', name:'Night Owl',      desc:'Session after 10 PM' },
  { id:'rocket',         icon:'🚀', name:'Rocket',         desc:'Reach Level 10' },
];

const GAM_XP = { login:10, topic:15, task:10, session:20, streak3:50, streak7:150, streak30:500 };

function _gam() {
  if (!state.gamification) {
    state.gamification = { xp:0, level:1, currentStreak:0, bestStreak:0,
      lastStreakDate:null, trophies:{}, xpLog:[] };
  }
  return state.gamification;
}

function gamLevelInfo(xp) {
  let cur = GAM_LEVELS[0];
  for (const l of GAM_LEVELS) { if (xp >= l.xp) cur = l; else break; }
  const ni = GAM_LEVELS.findIndex(l => l.level === cur.level);
  const next = GAM_LEVELS[ni + 1] || null;
  const pct  = next ? Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
  return { ...cur, next, pct, xpToNext: next ? next.xp - cur.xp : 0, xpInLevel: xp - cur.xp };
}

function _gamAwardXP(reason, amount) {
  try {
    const g = _gam();
    g.xp = (g.xp || 0) + amount;
    if (!g.xpLog) g.xpLog = [];
    g.xpLog.unshift({ reason, amount, date: new Date().toISOString() });
    if (g.xpLog.length > 50) g.xpLog.length = 50;
    const info = gamLevelInfo(g.xp);
    if (info.level > (g.level || 1)) {
      g.level = info.level;
      showToast('🎉 Level Up! ' + info.badge + ' ' + info.title, 'success');
    }
    saveData('gamification');
    // Floating XP popup
    const pop = document.createElement('div');
    pop.textContent = '+' + amount + ' XP — ' + reason;
    pop.style.cssText = 'position:fixed;bottom:80px;right:16px;background:linear-gradient(135deg,#7c3aed,#38bdf8);color:#fff;border-radius:99px;padding:7px 16px;font-size:0.8rem;font-weight:700;z-index:9999;pointer-events:none;animation:xpPop 2.5s forwards;';
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 2600);
  } catch(e) { console.warn('_gamAwardXP error:', e); }
}

function _gamEarnTrophy(id) {
  try {
    const g = _gam();
    if (!g.trophies) g.trophies = {};
    if (g.trophies[id]) return;
    const def = GAM_TROPHIES.find(t => t.id === id);
    if (!def) return;
    g.trophies[id] = { earnedAt: new Date().toISOString() };
    saveData('gamification');
    showToast('🏅 Trophy: ' + def.icon + ' ' + def.name + ' unlocked!', 'success');
  } catch(e) { console.warn('_gamEarnTrophy error:', e); }
}

function gamOnRealLogin() {
  try {
    const g = _gam();
    if (!g.trophies) g.trophies = {};
    const today = toDateKey(new Date());
    const yesterday = toDateKey(new Date(Date.now() - 86400000));
    if (g.lastStreakDate !== today) {
      if (g.lastStreakDate === yesterday) g.currentStreak = (g.currentStreak || 0) + 1;
      else g.currentStreak = 1;
      g.lastStreakDate = today;
      if ((g.currentStreak || 0) > (g.bestStreak || 0)) g.bestStreak = g.currentStreak;
      if (g.currentStreak === 3)  { _gamAwardXP('3-day streak bonus', GAM_XP.streak3);  _gamEarnTrophy('streak_3'); }
      if (g.currentStreak === 7)  { _gamAwardXP('7-day streak bonus', GAM_XP.streak7);  _gamEarnTrophy('on_fire'); }
      if (g.currentStreak === 30) { _gamAwardXP('30-day streak bonus', GAM_XP.streak30); _gamEarnTrophy('diamond_mind'); }
    }
    if (new Date().getHours() < 7) _gamEarnTrophy('early_bird');
    if (!g.trophies['first_step']) _gamEarnTrophy('first_step');
    _gamAwardXP('Daily login', GAM_XP.login);
  } catch(e) { console.warn('gamOnRealLogin error:', e); }
}

function gamOnTopicDone() {
  _gamAwardXP('Topic completed', GAM_XP.topic);
  const g = _gam();
  const today = toDateKey(new Date());
  const todayCount = g.xpLog.filter(e => e.reason === 'Topic completed' && e.date.startsWith(today)).length;
  if (todayCount >= 10) _gamEarnTrophy('speed_learner');
  const total = state.subjects.reduce((a,s) => a + s.topics.filter(t=>t.done).length, 0);
  if (total >= 50)  _gamEarnTrophy('half_century');
  if (total >= 100) _gamEarnTrophy('century');
  for (const s of state.subjects) {
    if (s.topics.length > 0 && s.topics.every(t=>t.done)) { _gamEarnTrophy('subject_master'); break; }
  }
  if (gamLevelInfo(_gam().xp).level >= 10) _gamEarnTrophy('rocket');
}

function gamOnTaskDone() { _gamAwardXP('Task completed', GAM_XP.task); }

function gamOnSessionDone() {
  _gamAwardXP('Session completed', GAM_XP.session);
  if (new Date().getHours() >= 22) _gamEarnTrophy('night_owl');
  const weekAgo = new Date(Date.now() - 7*86400000);
  const wk = state.sessions.filter(s => s.status==='done' && new Date(s.date)>=weekAgo).length;
  if (wk >= 5) _gamEarnTrophy('focused');
}

function renderAchievements() {
  if (!state.user) return;

  // Ensure page is visible
  const pageEl = document.getElementById('page-achievements');
  if (pageEl) pageEl.style.display = 'block';

  let g, info, streak;
  try {
    g      = _gam();
    info   = gamLevelInfo(g.xp);
    streak = typeof calcStreak === 'function' ? calcStreak() : g.currentStreak || 0;
  } catch(e) {
    console.warn('renderAchievements error:', e);
    return;
  }

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

  const lbEl = document.getElementById('ach-level-badge');
  if (lbEl) lbEl.textContent = info.badge + ' Level ' + info.level + ' — ' + info.title;

  const xlEl = document.getElementById('ach-xp-label');
  if (xlEl) xlEl.textContent = info.next
    ? (info.xpInLevel + ' / ' + info.xpToNext + ' XP to next level')
    : 'MAX LEVEL 👑';

  const bar = document.getElementById('ach-xp-bar');
  if (bar) bar.style.width = info.pct + '%';

  const sc = document.getElementById('ach-streak-chip');
  if (sc) sc.textContent = '🔥 ' + streak + ' day streak';

  set('ach-stat-xp',      g.xp);
  set('ach-stat-level',   info.level);
  set('ach-stat-streak',  (g.bestStreak || 0) + 'd');
  set('ach-stat-trophies', Object.keys(g.trophies || {}).length + ' / ' + GAM_TROPHIES.length);

  // Trophy grid
  const grid = document.getElementById('ach-trophy-grid');
  if (grid) {
    grid.innerHTML = GAM_TROPHIES.map(def => {
      const earned = g.trophies[def.id];
      const ds = earned ? new Date(earned.earnedAt).toLocaleDateString() : '';
      return `<div class="trophy-card ${earned ? 'earned' : 'locked'}">
        <span class="tc-icon">${def.icon}</span>
        <div class="tc-name">${def.name}</div>
        <div class="tc-desc">${def.desc}</div>
        <div class="tc-date">${earned ? '✅ ' + ds : '🔒 Locked'}</div>
      </div>`;
    }).join('');
  }

  // XP log
  const logEl = document.getElementById('ach-xp-log');
  if (logEl) {
    const log = g.xpLog || [];
    if (log.length === 0) {
      logEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:20px;">No XP earned yet — complete tasks, topics and sessions!</div>';
    } else {
      logEl.innerHTML = log.slice(0, 20).map(e => {
        const d = new Date(e.date).toLocaleString();
        return `<div class="xp-log-row">
          <span>${escHtml(e.reason)}</span>
          <span style="color:#7c3aed;font-weight:700;">+${e.amount} XP</span>
        </div>`;
      }).join('');
    }
  }
}


// ╔══════════════════════════════════════════════════════════════════╗
// ║         DAILY GOAL / FOCUS MODE ENGINE                         ║
// ╚══════════════════════════════════════════════════════════════════╝

let _goalSelectedMins = 60;
let _focusInterval = null;
let _focusStartTime = null;
let _focusElapsedMs = 0;

// ── Goal state helpers ────────────────────────────────────────────
function _getGoalKey() {
  return 'learnos_goal_' + toDateKey(new Date());
}

function _getGoal() {
  try {
    const raw = localStorage.getItem(_getGoalKey());
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function _saveGoal(goal) {
  try {
    localStorage.setItem(_getGoalKey(), JSON.stringify(goal));
    // Also clean up goals older than 7 days
    const keys = Object.keys(localStorage).filter(k => k.startsWith('learnos_goal_'));
    const cutoff = toDateKey(new Date(Date.now() - 7*86400000));
    keys.forEach(k => {
      const dateStr = k.replace('learnos_goal_', '');
      if (dateStr < cutoff) localStorage.removeItem(k);
    });
  } catch(e) {}
}

// ── Open goal setup modal ─────────────────────────────────────────
function openGoalModal() {
  // Populate subject dropdown
  const sel = document.getElementById('goal-subject-select');
  if (sel) {
    const existing = _getGoal();
    sel.innerHTML = '<option value="">— Pick a subject —</option>' +
      state.subjects.map(s =>
        `<option value="${s.id}" ${existing && existing.subjectId === s.id ? 'selected' : ''}>${escHtml(s.name)}</option>`
      ).join('');
  }
  // Restore previous time selection
  const existing = _getGoal();
  _goalSelectedMins = existing ? existing.targetMins : 60;
  selectGoalTime(_goalSelectedMins);
  // Restore note
  const noteEl = document.getElementById('goal-note-input');
  if (noteEl) noteEl.value = existing ? (existing.note || '') : '';
  const msgEl = document.getElementById('goal-modal-msg');
  if (msgEl) msgEl.textContent = '';
  openModal('modal-daily-goal');
}

function selectGoalTime(mins) {
  _goalSelectedMins = mins;
  document.querySelectorAll('.goal-time-btn').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.mins) === mins);
  });
}

function saveGoal() {
  const subjectId = document.getElementById('goal-subject-select')?.value;
  const note      = document.getElementById('goal-note-input')?.value.trim() || '';
  const msgEl     = document.getElementById('goal-modal-msg');

  if (!subjectId) {
    if (msgEl) { msgEl.style.color='#ef4444'; msgEl.textContent = 'Please pick a subject.'; }
    return;
  }
  if (!_goalSelectedMins) {
    if (msgEl) { msgEl.style.color='#ef4444'; msgEl.textContent = 'Please select a time goal.'; }
    return;
  }

  const subject = state.subjects.find(s => s.id === subjectId);
  const goal = {
    subjectId,
    subjectName: subject ? subject.name : 'Unknown',
    targetMins: _goalSelectedMins,
    note,
    achievedMins: _getGoal()?.achievedMins || 0,
    completed: false,
    createdAt: new Date().toISOString(),
    date: toDateKey(new Date())
  };

  _saveGoal(goal);
  if (msgEl) { msgEl.style.color='#22c55e'; msgEl.textContent = '✅ Goal set!'; }
  setTimeout(() => {
    closeModal('modal-daily-goal');
    renderDailyGoal();
  }, 800);
}

// ── Render goal card on dashboard ────────────────────────────────
function renderDailyGoal() {
  const el = document.getElementById('goal-card-content');
  if (!el) return;

  const goal = _getGoal();

  if (!goal || !goal.subjectId) {
    // No goal set yet
    el.innerHTML = `
      <button class="goal-empty-btn" onclick="openGoalModal()">
        <span style="font-size:1.6rem;">🎯</span>
        <div>
          <div style="font-weight:600;color:var(--text);font-size:0.88rem;">Set your focus goal for today</div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">Pick a subject + time target to stay on track</div>
        </div>
        <span style="margin-left:auto;font-size:1.2rem;">›</span>
      </button>`;
    return;
  }

  // Calculate today's actual study time for this subject from sessions
  const todayKey = toDateKey(new Date());
  const todaySessions = state.sessions.filter(s =>
    s.status === 'done' && s.date === todayKey &&
    (s.subjectId === goal.subjectId || s.subject === goal.subjectName)
  );
  const achievedMs  = todaySessions.reduce((a, s) => a + (s.duration || 0), 0);
  const achievedMin = Math.round(achievedMs / 60000);
  const targetMin   = goal.targetMins;
  const pct         = Math.min(100, Math.round((achievedMin / targetMin) * 100));
  const isComplete  = pct >= 100;

  // Update saved goal with latest achieved
  goal.achievedMins = achievedMin;
  goal.completed    = isComplete;
  _saveGoal(goal);

  const fmtTarget = targetMin >= 60
    ? (targetMin % 60 === 0 ? `${targetMin/60}h` : `${Math.floor(targetMin/60)}h ${targetMin%60}m`)
    : `${targetMin}m`;
  const fmtAchieved = achievedMin >= 60
    ? `${Math.floor(achievedMin/60)}h ${achievedMin%60}m`
    : `${achievedMin}m`;

  el.innerHTML = `
    <div class="goal-subject">${escHtml(goal.subjectName)}</div>
    ${goal.note ? `<div class="goal-target">${escHtml(goal.note)}</div>` : `<div class="goal-target">Target: ${fmtTarget} of focused study</div>`}
    <div class="goal-progress-wrap">
      <div class="goal-progress-fill" style="width:${pct}%;"></div>
    </div>
    <div class="goal-progress-label">
      <span>${fmtAchieved} studied</span>
      <span style="color:${isComplete ? '#22c55e' : 'var(--muted)'};">${pct}% / ${fmtTarget}</span>
    </div>
    ${isComplete
      ? `<div class="goal-complete-badge">🎉 Goal Achieved! Amazing work today!</div>`
      : `<button onclick="startFocusMode()" style="margin-top:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:var(--radius);padding:8px 18px;color:#fff;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          ⚡ Start Focus Session
        </button>`
    }`;

  // Award XP when goal is completed (only once per day)
  if (isComplete && !goal.xpAwarded) {
    goal.xpAwarded = true;
    _saveGoal(goal);
    try { _gamAwardXP('Daily goal achieved!', 30); } catch(e){}
    try { showToast('🎯 Daily goal achieved! +30 XP', 'success'); } catch(e){}
  }
}

// ── Focus Mode ────────────────────────────────────────────────────
function startFocusMode() {
  const goal = _getGoal();
  if (!goal) return;

  const overlay = document.getElementById('focus-mode-overlay');
  if (!overlay) return;

  // Set display info
  const sn = document.getElementById('focus-subject-name');
  if (sn) sn.textContent = goal.subjectName;
  const nd = document.getElementById('focus-note-display');
  if (nd) nd.textContent = goal.note || '';
  const gt = document.getElementById('focus-goal-target');
  const fmtTarget = goal.targetMins >= 60
    ? `${Math.floor(goal.targetMins/60)}h ${goal.targetMins%60 ? goal.targetMins%60+'m' : ''}`.trim()
    : `${goal.targetMins}m`;
  if (gt) gt.textContent = fmtTarget;

  _focusStartTime = Date.now();
  _focusElapsedMs = (goal.achievedMins || 0) * 60000;

  overlay.classList.add('active');

  // Update timer every second
  _focusInterval = setInterval(() => {
    const elapsed = _focusElapsedMs + (Date.now() - _focusStartTime);
    const totalSec = Math.floor(elapsed / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const display = h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${m}:${String(s).padStart(2,'0')}`;

    const td = document.getElementById('focus-time-display');
    if (td) td.textContent = display;

    // Update progress bar
    const pct = Math.min(100, (elapsed / (goal.targetMins * 60000)) * 100);
    const bar = document.getElementById('focus-goal-bar');
    if (bar) bar.style.width = pct + '%';

    // Flash complete when goal hit
    if (pct >= 100 && !goal._focusCompleteShown) {
      goal._focusCompleteShown = true;
      showToast('🎯 You hit your goal! Great work!', 'success');
    }
  }, 1000);
}

function exitFocusMode(addSession = true) {
  clearInterval(_focusInterval);
  _focusInterval = null;

  const overlay = document.getElementById('focus-mode-overlay');
  if (overlay) overlay.classList.remove('active');

  if (addSession && _focusStartTime) {
    const sessionMs = Date.now() - _focusStartTime;
    const goal = _getGoal();
    if (goal && sessionMs > 30000) { // only save if > 30 seconds
      // Add to sessions automatically
      const subject = state.subjects.find(s => s.id === goal.subjectId);
      const newSession = {
        id: 'ses_focus_' + Date.now(),
        name: goal.note || ('Focus: ' + goal.subjectName),
        subjectId: goal.subjectId,
        subject: goal.subjectName,
        color: subject ? subject.color : '#7c3aed',
        duration: sessionMs,
        date: toDateKey(new Date()),
        status: 'done',
        createdAt: new Date().toISOString()
      };
      state.sessions.unshift(newSession);
      saveData('sessions');
      try { gamOnSessionDone(); } catch(e){}
      showToast(`✅ Session saved: ${formatHM(sessionMs)}`, 'success');
    }
  }

  _focusStartTime = null;
  renderDailyGoal();
  renderDashboard();
}

// ── Morning popup — show goal prompt if no goal set yet today ─────
function checkMorningGoalPrompt() {
  if (!state.user) return;
  if (state.subjects.length === 0) return;
  const goal = _getGoal();
  if (!goal) {
    // Show subtle prompt after 3 seconds
    setTimeout(() => {
      showToast("🎯 Set today's focus goal! Tap the Goal card on Dashboard.", '');
    }, 3000);
  }
}

// ===================== PROFILE PAGE =====================
function renderProfile() {
  if (!state.user) return;

  const name  = state.user.name || '—';
  const email = window._fbUser ? window._fbUser.email : '—';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

  // Avatar & name
  const avatarEl = document.getElementById('profile-avatar-circle');
  if (avatarEl) avatarEl.textContent = initials;
  const nameBig = document.getElementById('profile-name-big');
  if (nameBig) nameBig.textContent = name;
  const emailBig = document.getElementById('profile-email-big');
  if (emailBig) emailBig.textContent = email;

  // Account info fields
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('profile-info-name',  name);
  set('profile-info-email', email);
  set('profile-info-login', state.user.loginTime || '—');

  // Days present this month
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const daysPresent = state.attendance.filter(a => a.date.startsWith(monthStr) && a.status === 'present').length;
  set('profile-info-present', daysPresent + ' day' + (daysPresent !== 1 ? 's' : ''));

  // Overall progress
  const totalTopics = state.subjects.reduce((a,s) => a + s.topics.length, 0);
  const doneTopics  = state.subjects.reduce((a,s) => a + s.topics.filter(t=>t.done).length, 0);
  const pct = totalTopics > 0 ? Math.round(doneTopics/totalTopics*100) : 0;
  set('profile-info-progress', pct + '%');

  // Stats
  const doneSessions = state.sessions.filter(s => s.status === 'done').length;
  const totalMs = state.sessions.filter(s=>s.status==='done').reduce((a,s)=>a+(s.duration||0),0);
  const totalHrs = Math.round(totalMs/3600000 * 10) / 10;
  set('profile-stat-subjects', state.subjects.length);
  set('profile-stat-todos',    doneTopics);
  set('profile-stat-sessions', doneSessions);
  set('profile-stat-hours',    totalHrs + 'h');

  // Subject progress list
  const listEl = document.getElementById('profile-subject-list');
  if (listEl) {
    if (state.subjects.length === 0) {
      listEl.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;padding:8px 0;">No subjects yet</div>';
    } else {
      listEl.innerHTML = state.subjects.map(s => {
        const total = s.topics.length;
        const done  = s.topics.filter(t=>t.done).length;
        const p     = total > 0 ? Math.round(done/total*100) : 0;
        const color = s.color || 'var(--accent)';
        return `<div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:0.85rem;font-weight:600;color:var(--text);">${escHtml(s.name)}</span>
            <span style="font-size:0.78rem;color:var(--muted);">${done}/${total} &nbsp;${p}%</span>
          </div>
          <div style="height:7px;background:var(--bg3);border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${p}%;background:${color};border-radius:99px;transition:width 0.4s ease;"></div>
          </div>
        </div>`;
      }).join('');
    }
  }
}

function colorForSubject(s) {
  if (s.color) return s.color;
  const idx = state.subjects.findIndex(x => x.id === s.id);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
}
let state = {
  user: null,
  subjects: [],
  tasks: [],
  sessions: [],
  attendance: [],
  leaves: [],
  posts: [],
  notes: [],
  currentSubjectId: null,
  activeTimers: [],
  matrixVisibleSubjects: S.get("los_matrix_cols_cache") || null,
  pendingAttachments: [],
  pendingAttachType: null,
  analyticsCharts: {},
  weekChartRef: null
};

// ===================== INIT =====================
function init() {
  startClock();
  // Wait for Firebase auth state — _onFirebaseLogin / _onFirebaseLogout are set below
  window._onFirebaseLogin = async (fbUser) => {
    window._fbUid = fbUser.uid;

    // ── Static owner check (email-based, no Firestore needed) ──
    const OWNER_EMAIL = 'owner@gmail.com';
    if (fbUser.email === OWNER_EMAIL) {
      window._fbDisplayName = 'Owner';
      hideAppLoader();
      showOwnerPanel();
      return; // owner doesn't need scheduleMidnightLogout
    }

    // ── Regular student ──
    let meta = {};
    try {
      const metaPromise = window._db.collection('users').doc(fbUser.uid).get();
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3000));
      const metaSnap = await Promise.race([metaPromise, timeoutPromise]);
      if (metaSnap && metaSnap.exists) meta = metaSnap.data();
    } catch(e) { console.warn('Meta load failed, continuing:', e); }

    const displayName = meta.displayName || window._fbDisplayName || fbUser.displayName || fbUser.email.split('@')[0];
    window._fbDisplayName = displayName;
    state.user = { name: displayName };

    try {
      await loadAllData();
    } catch(e) {
      console.warn('loadAllData failed, continuing with empty state:', e);
    }

    try {
      await showApp(!!window._realLogin);
    } catch(e) {
      console.warn('showApp failed:', e);
      // Force show app even if showApp errors
      hideAppLoader();
      document.getElementById('app')?.classList.add('visible');
    }

    window._realLogin = false;
    scheduleMidnightLogout();
  };
  window._onFirebaseLogout = () => {
    state.user = null;
    document.getElementById('app').classList.remove('visible');
    document.getElementById('owner-panel').classList.remove('visible');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
    hideAppLoader(); // Phase 4
  };
  // Check for owner session flag (fast path, still verified by Firestore meta on auth change)
  if (S.get('los_owner_session') && window._fbUser) {
    showOwnerPanel();
    return;
  }

  // If onAuthStateChanged already fired BEFORE init() ran, process the queued user now
  if (window._pendingAuthUser) {
    console.log('[LearnOS] Processing queued auth user from before init()');
    const u = window._pendingAuthUser;
    window._pendingAuthUser = null;
    window._onFirebaseLogin(u);
  }
}

async function showApp(isRealLogin = false) {
  // Hide loader and show app IMMEDIATELY — don't wait for renders
  hideAppLoader();
  document.getElementById('login-screen').style.display = 'none';
  const app = document.getElementById('app');
  app.classList.add('visible');
  attMonthOffset = 0;
  seedAIEngineerSubject();
  seedAgenticAISubject();
  seedAIAutoAgentSubject();
  seedMLOpsEngineerSubject();
  seedCollegeSubjects();
  renderDailyStudyMatrix();
  renderDashboard();
  renderTasks();
  renderActiveTimers();
  renderSessions();
  renderAttendance();
  renderPosts();
  renderNotes();
  navTo('dashboard');
  // Check for pending friend requests on login
  setTimeout(checkFriendRequestsOnLogin, 2000);
  // Auto-delete completed tasks older than 24h
  scheduleTaskAutoClean();
  // Morning goal prompt
  setTimeout(checkMorningGoalPrompt, 3500);

  const now     = new Date();
  const dateKey = toDateKey(now);
  const timeStr = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
  const isLeave = state.leaves.some(l => dateKey >= l.startDate && dateKey <= l.endDate);
  let attEntry  = state.attendance.find(a => a.date === dateKey);

  if (isRealLogin && !isLeave) {
    // ── Real login (email+password typed) — record attendance + history ──
    if (!attEntry) {
      attEntry = {
        date: dateKey,
        loginTime: timeStr,
        logoutTime: null,
        status: 'present',
        history: [{ type: 'login', time: timeStr, ts: now.toISOString() }]
      };
      state.attendance.push(attEntry);
    } else {
      // Already logged in today before — just add to history, keep first loginTime
      if (!attEntry.history) attEntry.history = [];
      // Only add if last entry wasn't already a login (avoid duplicate on fast refresh)
      const lastHist = attEntry.history[attEntry.history.length - 1];
      if (!lastHist || lastHist.type !== 'login') {
        attEntry.history.push({ type: 'login', time: timeStr, ts: now.toISOString() });
      }
    }
    saveData('attendance');
    state.user.loginTime = attEntry.loginTime; // always show first login of day
    fbSaveUserMeta({ displayName: state.user.name, lastLogin: now.toISOString(), role: 'student' }).catch(()=>{});
    gamOnRealLogin();
  } else {
    // ── Session restore (refresh/reopen) — restore loginTime from cloud record
    // This is the key fix for multi-device: attendance from device 1 is already
    // in Firestore, so device 2 just reads it correctly after loadAllData()
    state.user.loginTime = attEntry ? attEntry.loginTime : '—';
    // If no attendance entry today on this device, it means we haven't logged in
    // today on THIS device — but other devices may have. Don't create a new entry.
    // The cloud data (loaded in loadAllData) is the source of truth.
  }

  document.getElementById('topbar-name').textContent = state.user.name;
}

async function loadAllData() {
  // Timeout wrapper — if Firestore doesn't respond in 8s, continue with empty/cached data
  function withTimeout(promise, ms, fallback) {
    return Promise.race([
      promise,
      new Promise(resolve => setTimeout(() => resolve(fallback), ms))
    ]);
  }
  const t = 4000; // 4s timeout per request — faster loading
  const [subjects, tasks, sessions, attendance, leaves, notes, activeTimers, posts] = await Promise.all([
    withTimeout(fbLoad('subjects'),     t, S.get('los_subjects_cache')     || []),
    withTimeout(fbLoad('tasks'),        t, S.get('los_tasks_cache')        || []),
    withTimeout(fbLoad('sessions'),     t, S.get('los_sessions_cache')     || []),
    withTimeout(fbLoad('attendance'),   t, S.get('los_attendance_cache')   || []),
    withTimeout(fbLoad('leaves'),       t, S.get('los_leaves_cache')       || []),
    withTimeout(fbLoad('notes'),        t, S.get('los_notes_cache')        || []),
    withTimeout(fbLoad('activeTimers'), t, S.get('los_activeTimers_cache') || []),
    withTimeout(fbLoadShared('posts'),  t, S.get('los_posts')              || []),
    withTimeout(fbLoad('gamification'), t, S.get('los_gamification_cache') || null)
  ]);
  state.subjects    = subjects    || [];
  state.tasks       = tasks       || [];
  state.sessions    = sessions    || [];
  state.attendance  = attendance  || [];
  state.leaves      = leaves      || [];
  state.notes       = notes       || [];
  state.activeTimers= activeTimers|| [];
  state.posts        = posts        || [];
  state.gamification = gamification || null;
}

function saveData(key) {
  // Always write to local cache immediately (instant, works offline)
  const fbKeyMap = { subjects:'subjects', tasks:'tasks', sessions:'sessions',
    attendance:'attendance', leaves:'leaves', notes:'notes', activeTimers:'activeTimers',
    gamification:'gamification' };

  if (key === 'posts') {
    S.set('los_posts', state.posts);
    if (navigator.onLine && window._db && window._fbUid) {
      fbSaveShared('posts', state.posts);
    } else {
      offlineQueueAdd({ type:'SAVE_SHARED', key:'posts', data: state.posts });
    }
    return;
  }

  if (fbKeyMap[key]) {
    // 1. Write to localStorage immediately (works offline, instant UI)
    S.set('los_' + fbKeyMap[key] + '_cache', state[key]);

    // 2. Write to Firestore if online, queue if offline
    if (navigator.onLine && window._db && window._fbUid) {
      fbSave(fbKeyMap[key], state[key]);
    } else {
      offlineQueueAdd({ type:'SAVE_DATA', key: fbKeyMap[key], data: state[key] });
      console.log('[Offline] Queued save for:', key);
    }
  }
}

// ===================== CLOCK =====================
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-US', { hour12: false });
  const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const week = getWeekNumber(now);
  const el = document.getElementById('topbar-time');
  if (el) el.textContent = t;
  const ownerClockEl = document.getElementById('owner-topbar-time');
  if (ownerClockEl) ownerClockEl.textContent = t;
  const dt = document.getElementById('dash-time');
  if (dt) dt.textContent = t;
  document.getElementById('dash-date') && (document.getElementById('dash-date').textContent = d);
  document.getElementById('dash-day') && (document.getElementById('dash-day').textContent = day);
  document.getElementById('dash-week') && (document.getElementById('dash-week').textContent = 'W' + week);
  state.activeTimers.forEach(t => {
    if (t.status === 'running') {
      const elapsed = t.elapsed + (Date.now() - t.startTime);
      const el = document.getElementById('timer-disp-' + t.id);
      if (el) el.textContent = formatDuration(elapsed);
    }
  });
}
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ===================== MIDNIGHT LOGOUT =====================
function scheduleMidnightLogout() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msToMidnight = midnight - now;
  // Show 60-second warning banner before midnight
  setTimeout(() => {
    const banner = document.getElementById('logout-banner');
    if (!state.user) return;
    banner.style.display = 'block';
    let cnt = 60;
    const interval = setInterval(() => {
      cnt--;
      document.getElementById('logout-countdown').textContent = cnt;
      if (cnt <= 0) { clearInterval(interval); doMidnightLogout(); }
    }, 1000);
  }, Math.max(0, msToMidnight - 60000));
  setTimeout(() => {
    if (state.user) doMidnightLogout();
  }, msToMidnight);
}

async function doMidnightLogout() {
  // Record logout in attendance history
  if (state.user) {
    const now = new Date();
    const dateKey = toDateKey(now);
    const logoutTime = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
    const attIdx = state.attendance.findIndex(a => a.date === dateKey);
    if (attIdx >= 0) {
      state.attendance[attIdx].logoutTime = logoutTime;
      if (!state.attendance[attIdx].history) state.attendance[attIdx].history = [];
      state.attendance[attIdx].history.push({ type: 'logout', time: logoutTime, ts: now.toISOString() });
      saveData('attendance');
    }
    // Pause running timers
    state.activeTimers.forEach(t => {
      if (t.status === 'running') { t.elapsed += Date.now() - t.startTime; t.status = 'paused'; }
    });
    saveData('activeTimers');
  }
  document.getElementById('logout-banner').style.display = 'none';
  showToast('Session ended. Good night! 🌙', 'success');
  state.user = null;
  // Sign out of Firebase — this clears the session so user MUST re-enter credentials
  try { await window._auth.signOut(); } catch(e) {}
  // _onFirebaseLogout will handle UI cleanup (show login screen)
}

// ===================== LOGIN / LOGOUT =====================
async function doLogin() {
  const email = document.getElementById('login-username').value.trim();
  const displayName = (document.getElementById('login-displayname').value || '').trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');

  errEl.textContent = '';
  if (!email) { errEl.textContent = 'Please enter your email.'; return; }
  if (!pass)  { errEl.textContent = 'Please enter a password.'; return; }
  if (!window._fbApi) { errEl.textContent = 'Firebase not loaded yet — please wait a moment and try again.'; return; }

  btn.textContent = 'Signing in…';
  btn.disabled = true;

  // ── Static owner credentials check ──
  const OWNER_EMAIL = 'owner@gmail.com';
  const OWNER_PASS  = '101010';
  if (email === OWNER_EMAIL && pass !== OWNER_PASS) {
    errEl.textContent = 'Incorrect owner password.';
    btn.textContent = 'Sign In / Create Account';
    btn.disabled = false;
    return;
  }

  try {
    // Mark this as a REAL login (user typed credentials)
    window._realLogin = true;
    // Try sign in first
    await window._auth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged fires → _onFirebaseLogin handles the rest
  } catch (e) {
    window._realLogin = false;
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
      if (email === 'owner@gmail.com') {
        // Owner account — create it in Firebase Auth silently (first time only)
        try {
          window._realLogin = true;
          await window._auth.createUserWithEmailAndPassword(email, pass);
          // onAuthStateChanged fires → _onFirebaseLogin detects owner email → showOwnerPanel
        } catch (ce) {
          window._realLogin = false;
          errEl.textContent = friendlyAuthError(ce.code);
        }
      } else {
        // Regular student — create new account
        try {
          window._realLogin = true;
          await window._auth.createUserWithEmailAndPassword(email, pass);
          const name = displayName || email.split('@')[0];
          window._fbDisplayName = name;
          fbSaveUserMeta({ displayName: name, email, role: 'student', createdAt: new Date().toISOString() }).catch(()=>{});
        } catch (ce) {
          window._realLogin = false;
          errEl.textContent = friendlyAuthError(ce.code);
        }
      }
    } else {
      errEl.textContent = friendlyAuthError(e.code);
    }
  } finally {
    btn.textContent = 'Sign In / Create Account';
    btn.disabled = false;
  }
}

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/user-not-found': 'No account found — check email or create one.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/email-already-in-use': 'Email already registered — try signing in.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.'
  };
  return map[code] || ('Error: ' + code);
}

async function doLogout(auto = false) {
  if (!state.user) return;
  // Save logout time to attendance + history
  const now = new Date();
  const dateKey = toDateKey(now);
  const logoutTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const attIdx = state.attendance.findIndex(a => a.date === dateKey);
  if (attIdx >= 0) {
    state.attendance[attIdx].logoutTime = logoutTime;
    if (!state.attendance[attIdx].history) state.attendance[attIdx].history = [];
    state.attendance[attIdx].history.push({ type: 'logout', time: logoutTime, ts: now.toISOString() });
    saveData('attendance');
  }
  // Pause any running timers
  state.activeTimers.forEach(t => {
    if (t.status === 'running') { t.elapsed += Date.now() - t.startTime; t.status = 'paused'; }
  });
  saveData('activeTimers');
  document.getElementById('logout-banner').style.display = 'none';
  if (auto) showToast('Session ended. Good night! 🌙', 'success');
  state.user = null;
  // Sign out of Firebase — user must re-enter email+password to get back in
  try { await window._auth.signOut(); } catch(e) {
    document.getElementById('app').classList.remove('visible');
    document.getElementById('login-screen').style.display = 'flex';
  }
}

// ===================== NAVIGATION =====================
function navTo(page) {
  // Pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector('.nav-item[data-page="' + page + '"]');
  if (navBtn) navBtn.classList.add('active');

  // Bottom nav (mobile)
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const bnavBtn = document.getElementById('bnav-' + page);
  if (bnavBtn) bnavBtn.classList.add('active');

  // Render hooks
  if (page === 'dashboard')  renderDashboard();
  if (page === 'subjects')   renderSubjects();
  if (page === 'tasks')      { renderTaskSubjectFilter(); renderTasks(); }
  if (page === 'timer')      { renderActiveTimers(); renderSessions(); }
  if (page === 'attendance') renderAttendance();
  if (page === 'profile')    renderProfile();
  if (page === 'community')  renderPosts();
  if (page === 'analytics')  renderAnalytics();
  if (page === 'notes')      renderNotes();
  if (page === 'friends')      initFriends();
  if (page === 'achievements') renderAchievements();

  // Close sidebar + overlay + more menu on mobile
  closeSidebarMobile();
  closeMoreMenu();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen  = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebarMobile();
  } else {
    sidebar.classList.add('open');
    if (overlay) { overlay.classList.add('visible'); }
    // Don't lock body — lock #main scroll instead to keep PWA scroll working
    const main = document.getElementById('main');
    if (main) main.style.overflow = 'hidden';
  }
}

function closeSidebarMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  const ov = document.getElementById('sidebar-overlay');
  if (ov) ov.classList.remove('visible');
  // Restore #main scroll
  const main = document.getElementById('main');
  if (main) main.style.overflow = '';
}

function toggleMoreMenu() {
  const menu = document.getElementById('more-menu');
  const overlay = document.getElementById('more-overlay');
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  if (isOpen) {
    closeMoreMenu();
  } else {
    menu.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    document.getElementById('bnav-more')?.classList.add('active');
  }
}

function closeMoreMenu() {
  const menu = document.getElementById('more-menu');
  const overlay = document.getElementById('more-overlay');
  if (menu) menu.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  document.getElementById('bnav-more')?.classList.remove('active');
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  if (!state.user) return;
  // login time
  const el = document.getElementById('dash-login-time');
  if (el) el.textContent = state.user.loginTime || '—';

  // overall progress
  const subjs = state.subjects;
  let overall = 0;
  if (subjs.length > 0) {
    const sum = subjs.reduce((a, s) => a + calcSubjectProgress(s), 0);
    overall = Math.round(sum / subjs.length);
  }
  setRoundProgress('overall-circle', 'overall-pct', overall);

  // attendance this month
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const daysElapsed = now.getDate();
  const presentDays = state.attendance.filter(a => a.date.startsWith(monthStr) && a.status === 'present').length;
  const leaveDays = state.leaves.filter(l => {
    const s = new Date(l.startDate), e = new Date(l.endDate);
    const ms = new Date(monthStr + '-01'), me = new Date(now);
    return s <= me && e >= ms;
  }).length;
  const attRate = daysElapsed > 0 ? Math.round(((presentDays + leaveDays) / daysElapsed) * 100) : 0;
  setRoundProgress('att-circle', 'att-pct', Math.min(100, attRate));

  // subject bars
  const dashSubj = document.getElementById('dash-subjects');
  if (subjs.length === 0) {
    dashSubj.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">No subjects yet</div></div>';
  } else {
    dashSubj.innerHTML = subjs.map(s => {
      const pct = calcSubjectProgress(s);
      const c = colorForSubject(s);
      return `<div class="subject-bar-row" onclick="openRoadmap('${s.id}')">
        <span class="subject-bar-name" style="color:${c};">●&nbsp; ${escHtml(s.name)}</span>
        <div class="subject-bar-track"><div class="subject-bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${c}, ${c}cc);"></div></div>
        <span class="subject-bar-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  // tasks
  const tasks = state.tasks;
  document.getElementById('dash-total-tasks').textContent = tasks.length;
  document.getElementById('dash-done-tasks').textContent = tasks.filter(t => t.status === 'completed').length;
  document.getElementById('dash-pending-tasks').textContent = tasks.filter(t => t.status === 'pending').length;
  document.getElementById('dash-cancel-tasks').textContent = tasks.filter(t => t.status === 'cancelled').length;

  // today's study
  const todayKey = toDateKey(new Date());
  const yesterdayKey = toDateKey(new Date(Date.now() - 86400000));
  const todaySessions = state.sessions.filter(s => s.date === todayKey && s.status === 'done');
  const yesterdaySessions = state.sessions.filter(s => s.date === yesterdayKey && s.status === 'done');
  const totalMs = todaySessions.reduce((a, s) => a + s.duration, 0);
  const yesterdayMs = yesterdaySessions.reduce((a, s) => a + s.duration, 0);
  document.getElementById('dash-study-today').textContent = formatHM(totalMs);

  // vs yesterday badge
  const vsBadge = document.getElementById('dash-vs-yesterday');
  if (vsBadge) {
    if (yesterdayMs === 0 && totalMs === 0) {
      vsBadge.textContent = 'No data yet';
    } else if (yesterdayMs === 0) {
      vsBadge.textContent = '🔥 First session today';
    } else {
      const diffPct = Math.round(((totalMs - yesterdayMs) / yesterdayMs) * 100);
      vsBadge.textContent = diffPct >= 0 ? `▲ ${diffPct}% vs yesterday` : `▼ ${Math.abs(diffPct)}% vs yesterday`;
      vsBadge.style.color = diffPct >= 0 ? 'var(--success)' : 'var(--warn)';
      vsBadge.style.background = diffPct >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)';
      vsBadge.style.borderColor = diffPct >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)';
    }
  }

  // mini stats
  document.getElementById('dash-sessions-count').textContent = todaySessions.length;
  const avgMs = todaySessions.length > 0 ? totalMs / todaySessions.length : 0;
  document.getElementById('dash-avg-session').textContent = avgMs > 0 ? formatHM(avgMs) : '0m';
  const weekStartForTotal = new Date();
  const dow = weekStartForTotal.getDay();
  weekStartForTotal.setDate(weekStartForTotal.getDate() - (dow === 0 ? 6 : dow - 1));
  let weekMs = 0;
  for (let d = new Date(weekStartForTotal); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = toDateKey(d);
    weekMs += state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
  }
  document.getElementById('dash-week-total').textContent = (Math.round(weekMs / 3600000 * 10) / 10) + 'h';

  const sessDiv = document.getElementById('dash-sessions-today');
  if (todaySessions.length === 0) {
    sessDiv.innerHTML = '<div class="empty-state" style="padding:24px 12px;"><div class="empty-icon" style="font-size:1.8rem;">📖</div><div class="empty-text">No sessions today yet — start a timer!</div></div>';
  } else {
    sessDiv.innerHTML = todaySessions.map(s => {
      const subj = state.subjects.find(x => x.id === s.subjectId);
      const c = subj ? colorForSubject(subj) : '#8b80a8';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="width:6px;height:6px;border-radius:50%;background:${c};flex-shrink:0;"></div>
        <span style="font-size:0.82rem;color:${c};font-weight:600;">${escHtml(getSubjectName(s.subjectId))}</span>
        <span style="font-size:0.8rem;color:var(--muted);">${escHtml(s.taskName)}</span>
        <span style="margin-left:auto;font-size:0.78rem;color:var(--text);font-weight:600;font-family:var(--font-display);">${formatHM(s.duration)}</span>
      </div>`;
    }).join('');
  }

  // week chart
  renderWeekChart();

  // streak
  const streakEl = document.getElementById('dash-streak');
  if (streakEl) streakEl.textContent = '🔥 ' + calcStreak();
  // Daily goal card
  try { renderDailyGoal(); } catch(e) {}
  try { renderDailyStudyMatrix(); } catch(e) {}
}

function calcStreak() {
  const studyDays = new Set(state.sessions.filter(s => s.status === 'done').map(s => s.date));
  let streak = 0;
  let cursor = new Date();
  // if no session today yet, start counting from yesterday so an active streak isn't broken mid-day
  if (!studyDays.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (studyDays.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderWeekChart() {
  const ctx = document.getElementById('study-week-chart');
  if (!ctx) return;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const weekData = days.map((d, i) => {
    const date = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = i + 1 - (dayOfWeek === 0 ? 7 : dayOfWeek);
    date.setDate(date.getDate() + diff);
    const key = toDateKey(date);
    const ms = state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
    return Math.round(ms / 3600000 * 10) / 10;
  });
  if (state.weekChartRef) state.weekChartRef.destroy();
  const canvasCtx = ctx.getContext('2d');
  const gradient = canvasCtx.createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, '#c084fc');
  gradient.addColorStop(1, '#7c3aed');
  const colors = days.map((_, i) => i === todayIdx ? gradient : 'rgba(124,58,237,0.35)');
  const borderColors = days.map((_, i) => i === todayIdx ? '#c084fc' : 'rgba(124,58,237,0.5)');
  state.weekChartRef = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{ data: weekData, backgroundColor: colors, borderColor: borderColors, borderWidth: 1.5, borderRadius: 8, maxBarThickness: 36 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e1a30', borderColor: '#2e2850', borderWidth: 1, padding: 10,
          titleFont: { family: 'Inter', size: 11 }, bodyFont: { family: 'Inter', size: 12, weight: '600' },
          callbacks: { label: ctx => ctx.parsed.y + ' hours' }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b80a8', font: { size: 10, family: 'Inter' } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b80a8', font: { size: 10, family: 'Inter' } }, beginAtZero: true }
      }
    }
  });
}

function setRoundProgress(circleId, pctId, pct) {
  const circle = document.getElementById(circleId);
  const label = document.getElementById(pctId);
  if (!circle || !label) return;
  const r = 58; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  circle.style.strokeDashoffset = offset;
  label.textContent = pct + '%';
}

// ===================== SUBJECTS =====================
function calcSubjectProgress(s) {
  if (!s.topics || s.topics.length === 0) return 0;
  const done = s.topics.filter(t => t.done).length;
  return Math.round((done / s.topics.length) * 100);
}

function renderSubjects() {
  const grid = document.getElementById('subjects-grid');
  if (state.subjects.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><div class="empty-text">No subjects yet. Add one above!</div></div>';
    return;
  }
  grid.innerHTML = state.subjects.map(s => {
    const pct = calcSubjectProgress(s);
    const total = s.topics ? s.topics.length : 0;
    const done = s.topics ? s.topics.filter(t => t.done).length : 0;
    const c = colorForSubject(s);
    return `<div class="subject-card" onclick="openRoadmap('${s.id}')" style="border-top:3px solid ${c};">
      <div class="sc-name" style="color:${c};">${escHtml(s.name)}</div>
      <div class="sc-meta">${done}/${total} topics complete</div>
      <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${c}, ${c}cc);"></div></div>
      <div class="sc-pct" style="color:${c};">${pct}%</div>
    </div>`;
  }).join('');
}

function openRoadmap(id) {
  const s = state.subjects.find(s => s.id === id);
  if (!s) return;
  state.currentSubjectId = id;
  const c = colorForSubject(s);
  document.getElementById('roadmap-modal-title').textContent = s.name;
  document.getElementById('roadmap-modal-title').style.color = c;
  renderTopicList(s);
  openModal('modal-roadmap');
}

function renderTopicList(s) {
  const pct = calcSubjectProgress(s);
  const c = colorForSubject(s);
  const total = s.topics ? s.topics.length : 0;
  const done = s.topics ? s.topics.filter(t => t.done).length : 0;
  document.getElementById('roadmap-progress-bar').style.width = pct + '%';
  document.getElementById('roadmap-progress-bar').style.background = `linear-gradient(90deg, ${c}, ${c}cc)`;
  document.getElementById('roadmap-progress-text').textContent = `${done} of ${total} topics done`;
  document.getElementById('roadmap-progress-pct').textContent = pct + '%';
  document.getElementById('roadmap-progress-pct').style.color = c;
  const list = document.getElementById('topic-list');
  if (!s.topics || s.topics.length === 0) {
    list.innerHTML = '<div style="font-size:0.83rem;color:var(--muted);padding:8px 0;">No topics yet. Add one below.</div>';
    return;
  }
  list.innerHTML = s.topics.map((t, i) => `
    <div class="topic-item">
      <div class="topic-check ${t.done ? 'done' : ''}" style="${t.done ? `background:${c};border-color:${c};` : ''}" onclick="toggleTopic('${s.id}', ${i})">${t.done ? '✓' : ''}</div>
      <div class="topic-name ${t.done ? 'done' : ''}">${escHtml(t.name)}</div>
      <div style="display:flex;gap:2px;">
        <button class="topic-del" onclick="moveTopic('${s.id}', ${i}, -1)" ${i === 0 ? 'style="opacity:0.25;pointer-events:none;"' : ''} title="Move up">↑</button>
        <button class="topic-del" onclick="moveTopic('${s.id}', ${i}, 1)" ${i === s.topics.length - 1 ? 'style="opacity:0.25;pointer-events:none;"' : ''} title="Move down">↓</button>
      </div>
      <button class="topic-del" onclick="deleteTopic('${s.id}', ${i})">✕</button>
    </div>`).join('');
}

function moveTopic(subjectId, idx, dir) {
  const s = state.subjects.find(s => s.id === subjectId);
  if (!s) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= s.topics.length) return;
  [s.topics[idx], s.topics[newIdx]] = [s.topics[newIdx], s.topics[idx]];
  saveData('subjects');
  renderTopicList(s);
}

function toggleTopic(subjectId, idx) {
  const s = state.subjects.find(s => s.id === subjectId);
  if (!s) return;
  const wasDone = s.topics[idx].done;
  s.topics[idx].done = !wasDone;
  saveData('subjects');
  if (!wasDone) gamOnTopicDone();
  renderTopicList(s);
  renderSubjects();
}

function deleteTopic(subjectId, idx) {
  const s = state.subjects.find(s => s.id === subjectId);
  if (!s) return;
  if (!confirm(`Delete topic "${s.topics[idx].name}"?`)) return;
  s.topics.splice(idx, 1);
  saveData('subjects');
  renderTopicList(s);
}

function addTopic() {
  const input = document.getElementById('new-topic-input');
  const name = input.value.trim();
  if (!name) return;
  const s = state.subjects.find(s => s.id === state.currentSubjectId);
  if (!s) return;
  if (!s.topics) s.topics = [];
  s.topics.push({ name, done: false });
  saveData('subjects');
  input.value = '';
  renderTopicList(s);
}

function deleteSubject() {
  if (!confirm('Delete this subject and all its topics?')) return;
  state.subjects = state.subjects.filter(s => s.id !== state.currentSubjectId);
  saveData('subjects');
  closeModal('modal-roadmap');
  renderSubjects();
  showToast('Subject deleted', 'success');
}

// ===================== TASKS =====================
function renderTaskSubjectFilter() {
  const sel1 = document.getElementById('task-filter-subject');
  const sel2 = document.getElementById('task-subject-input');
  const sel3 = document.getElementById('session-subject-input');
  const opts = state.subjects.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');
  if (sel1) sel1.innerHTML = '<option value="">All Subjects</option>' + opts;
  if (sel2) sel2.innerHTML = opts || '<option value="">⚠ Add a subject first</option>';
  if (sel3) sel3.innerHTML = opts || '<option value="">⚠ Add a subject first</option>';
}

function renderTasks() {
  const search = (document.getElementById('task-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('task-filter-status')?.value || '';
  const filterSubj = document.getElementById('task-filter-subject')?.value || '';
  let tasks = state.tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterSubj && t.subjectId !== filterSubj) return false;
    if (search && !t.name.toLowerCase().includes(search)) return false;
    return true;
  });
  const list = document.getElementById('task-list');
  if (!list) return;
  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">No tasks found</div></div>';
    return;
  }
  list.innerHTML = tasks.map(t => {
    const isDone = t.status === 'completed';
    const isCan = t.status === 'cancelled';
    const subj = state.subjects.find(s => s.id === t.subjectId);
    const subjColor = subj ? colorForSubject(subj) : '#8b80a8';
    const isOverdue = t.deadline && t.status === 'pending' && t.deadline < toDateKey(new Date());
    return `<div class="task-item">
      <div class="task-checkbox ${isDone ? 'checked' : isCan ? 'cancelled-cb' : ''}" onclick="quickToggleTask('${t.id}')">${isDone ? '✓' : isCan ? '✕' : ''}</div>
      <div class="task-info">
        <div class="task-name ${isDone ? 'done' : ''}">${escHtml(t.name)}</div>
        <div class="task-tags">
          <span class="tag subject" style="background:${subjColor}26;color:${subjColor};">${escHtml(getSubjectName(t.subjectId))}</span>
          <span class="tag priority-${t.priority}">${t.priority}</span>
          <span class="tag status-${t.status}">${t.status}</span>
          ${isOverdue ? '<span class="tag" style="background:rgba(239,68,68,0.2);color:#ef4444;">⚠ overdue</span>' : ''}
        </div>
      </div>
      ${t.deadline ? `<div class="task-deadline" style="${isOverdue ? 'color:var(--danger);font-weight:600;' : ''}">📅 ${t.deadline}</div>` : ''}
      <div class="task-actions">
        <button class="btn-icon" onclick="openTaskModal('${t.id}')">✏</button>
        <button class="btn-icon danger" onclick="deleteTask('${t.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function openTaskModal(id) {
  renderTaskSubjectFilter();
  document.getElementById('task-modal-title').textContent = id ? 'Edit Task' : 'Add Task';
  document.getElementById('edit-task-id').value = id || '';
  if (id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    document.getElementById('task-name-input').value = t.name;
    document.getElementById('task-subject-input').value = t.subjectId || '';
    document.getElementById('task-priority-input').value = t.priority;
    document.getElementById('task-deadline-input').value = t.deadline || '';
    document.getElementById('task-status-input').value = t.status;
  } else {
    document.getElementById('task-name-input').value = '';
    document.getElementById('task-priority-input').value = 'medium';
    document.getElementById('task-deadline-input').value = '';
    document.getElementById('task-status-input').value = 'pending';
  }
  openModal('modal-task');
}

function saveTask() {
  if (state.subjects.length === 0) { showToast('Add a subject first', 'error'); return; }
  const id = document.getElementById('edit-task-id').value;
  const name = document.getElementById('task-name-input').value.trim();
  if (!name) { showToast('Task name required', 'error'); return; }
  const task = {
    id: id || 'task_' + Date.now(),
    name,
    subjectId: document.getElementById('task-subject-input').value,
    priority: document.getElementById('task-priority-input').value,
    deadline: document.getElementById('task-deadline-input').value,
    status: document.getElementById('task-status-input').value
  };
  if (id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx >= 0) state.tasks[idx] = task;
  } else {
    state.tasks.push(task);
  }
  saveData('tasks');
  closeModal('modal-task');
  renderTasks();
  showToast(id ? 'Task updated' : 'Task added', 'success');
}

function quickToggleTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  if (t.status === 'pending') {
    t.status = 'completed';
    t.completedAt = Date.now();
    gamOnTaskDone();
  } else if (t.status === 'completed') {
    t.status = 'cancelled';
    t.completedAt = null;
  } else {
    t.status = 'pending';
    t.completedAt = null;
  }
  saveData('tasks');
  renderTasks();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveData('tasks');
  renderTasks();
  showToast('Task deleted');
}

// ── Auto-delete completed tasks after 24 hours ────────────────────
function autoDeleteCompletedTasks() {
  if (!state.tasks || state.tasks.length === 0) return;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const before = state.tasks.length;

  state.tasks = state.tasks.filter(t => {
    if (t.status !== 'completed') return true; // keep pending/cancelled

    if (t.completedAt) {
      // Has timestamp — delete if older than 24h
      return (now - t.completedAt) < TWENTY_FOUR_HOURS;
    } else {
      // No timestamp (completed before this feature) — stamp now and delete on next run
      t.completedAt = now - TWENTY_FOUR_HOURS - 1; // mark as already expired
      return false; // delete immediately
    }
  });

  const removed = before - state.tasks.length;
  if (removed > 0) {
    saveData('tasks');
    showToast(`🗑️ ${removed} completed task${removed > 1 ? 's' : ''} auto-removed`, '');
    renderTasks();
    console.log(`[AutoClean] Removed ${removed} completed task(s)`);
  }
}

// Run auto-delete every hour while app is open
function scheduleTaskAutoClean() {
  autoDeleteCompletedTasks(); // run once immediately on load
  setInterval(autoDeleteCompletedTasks, 60 * 60 * 1000); // then every hour
}

// ===================== TIMER (MULTI, PARALLEL) =====================
function openSessionModal() {
  renderTaskSubjectFilter();
  document.getElementById('session-task-input').value = '';
  openModal('modal-session');
}

function startSession() {
  if (state.subjects.length === 0) { showToast('Add a subject first', 'error'); return; }
  const subjectId = document.getElementById('session-subject-input').value;
  const taskName = document.getElementById('session-task-input').value.trim();
  if (!taskName) { showToast('Enter a task name', 'error'); return; }
  closeModal('modal-session');
  state.activeTimers.push({
    id: 'tmr_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    subjectId, taskName,
    status: 'running',
    startTime: Date.now(),
    elapsed: 0
  });
  saveData('activeTimers');
  renderActiveTimers();
}

function pauseResumeTimer(id) {
  const t = state.activeTimers.find(t => t.id === id);
  if (!t) return;
  if (t.status === 'running') {
    t.elapsed += Date.now() - t.startTime;
    t.status = 'paused';
  } else if (t.status === 'paused') {
    t.startTime = Date.now();
    t.status = 'running';
  }
  saveData('activeTimers');
  renderActiveTimers();
}

function markTimerPending(id) {
  const t = state.activeTimers.find(t => t.id === id);
  if (!t) return;
  if (t.status === 'running') t.elapsed += Date.now() - t.startTime;
  t.status = 'pending';
  saveData('activeTimers');
  renderActiveTimers();
  showToast(`Marked pending at ${formatDuration(t.elapsed)}`);
}

function resumePendingTimer(id) {
  const t = state.activeTimers.find(t => t.id === id);
  if (!t) return;
  t.status = 'running';
  t.startTime = Date.now();
  saveData('activeTimers');
  renderActiveTimers();
  showToast('Resumed — continuing from ' + formatDuration(t.elapsed));
}

function finishTimer(id, status = 'done') {
  const idx = state.activeTimers.findIndex(t => t.id === id);
  if (idx < 0) return;
  const t = state.activeTimers[idx];
  const finalElapsed = t.elapsed + (t.status === 'running' ? Date.now() - t.startTime : 0);
  const session = {
    id: 'sess_' + Date.now(),
    date: toDateKey(new Date()),
    subjectId: t.subjectId,
    taskName: t.taskName,
    duration: finalElapsed,
    status
  };
  state.sessions.push(session);
  saveData('sessions');
  state.activeTimers.splice(idx, 1);
  saveData('activeTimers');
  renderActiveTimers();
  renderSessions();
  renderDashboard();
  if (status === 'done') gamOnSessionDone();
  showToast(status === 'done' ? `Session saved: ${formatHM(finalElapsed)}` : 'Session cancelled', status === 'done' ? 'success' : '');
  // Update daily goal progress
  try { renderDailyGoal(); } catch(e) {}
}

function cancelTimer(id) {
  if (!confirm('Discard this timer without saving?')) return;
  finishTimer(id, 'cancelled');
}

function renderActiveTimers() {
  const container = document.getElementById('active-timers-container');
  const badge = document.getElementById('timer-nav-badge');
  if (!container) return;
  const running = state.activeTimers.filter(t => t.status === 'running' || t.status === 'paused');
  const pending = state.activeTimers.filter(t => t.status === 'pending');

  if (badge) badge.style.display = running.length > 0 ? 'inline-block' : 'none';

  if (running.length === 0) {
    container.innerHTML = '<div class="empty-state" id="no-active-timers"><div class="empty-icon">⏱</div><div class="empty-text">No active timers — click "+ Add Timer" to start studying</div></div>';
  } else {
    container.innerHTML = running.map(t => {
      const subj = state.subjects.find(s => s.id === t.subjectId);
      const c = subj ? colorForSubject(subj) : '#c084fc';
      const isPaused = t.status === 'paused';
      const liveElapsed = t.elapsed + (t.status === 'running' ? Date.now() - t.startTime : 0);
      return `<div class="timer-card ${isPaused ? 'is-paused' : ''}" style="--timer-accent:${c};">
        <div class="timer-card-info">
          <div class="timer-card-status" style="color:${isPaused ? 'var(--warn)' : c};">${isPaused ? '⏸ Paused' : '● Running'}</div>
          <div class="timer-card-subject" style="color:${c};">${escHtml(getSubjectName(t.subjectId))}</div>
          <div class="timer-card-task">${escHtml(t.taskName)}</div>
        </div>
        <div class="timer-card-display ${isPaused ? 'paused' : 'running'}" id="timer-disp-${t.id}">${formatDuration(liveElapsed)}</div>
        <div class="timer-card-actions">
          <button class="btn-timer-sm ${isPaused ? 'btn-start' : 'btn-pause'}" onclick="pauseResumeTimer('${t.id}')">${isPaused ? '▶ Resume' : '⏸ Pause'}</button>
          <button class="btn-timer-sm btn-done" onclick="finishTimer('${t.id}', 'done')">✓ Done</button>
          <button class="btn-timer-sm btn-pending-t" onclick="markTimerPending('${t.id}')">⏸ Pending</button>
          <button class="btn-timer-sm btn-cancel-t" onclick="cancelTimer('${t.id}')">✕ Cancel</button>
        </div>
      </div>`;
    }).join('');
  }

  const pendList = document.getElementById('pending-sessions-list');
  if (pendList) {
    if (pending.length === 0) {
      pendList.innerHTML = '<div class="empty-state"><div class="empty-icon">⏸</div><div class="empty-text">No pending sessions</div></div>';
    } else {
      pendList.innerHTML = pending.map(t => {
        const subj = state.subjects.find(s => s.id === t.subjectId);
        const c = subj ? colorForSubject(subj) : '#8b80a8';
        return `<div class="pending-session-item">
          <div class="pending-session-time">${formatDuration(t.elapsed)}</div>
          <div style="flex:1;">
            <div style="font-size:0.88rem;font-weight:600;color:${c};">${escHtml(getSubjectName(t.subjectId))}</div>
            <div style="font-size:0.8rem;color:var(--muted);">${escHtml(t.taskName)}</div>
          </div>
          <button class="btn-timer-sm btn-start" onclick="resumePendingTimer('${t.id}')">▶ Resume</button>
          <button class="btn-timer-sm btn-done" onclick="finishTimer('${t.id}', 'done')">✓ Done</button>
          <button class="btn-icon danger" onclick="cancelTimer('${t.id}')">🗑</button>
        </div>`;
      }).join('');
    }
  }
}

function renderSessions() {
  const list = document.getElementById('session-history-list');
  if (!list) return;
  if (state.sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⏱</div><div class="empty-text">No sessions yet</div></div>';
    return;
  }
  // Group by date
  const grouped = {};
  [...state.sessions].reverse().forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });
  list.innerHTML = Object.entries(grouped).map(([date, sessions]) => {
    const totalMs = sessions.filter(s => s.status === 'done').reduce((a, s) => a + s.duration, 0);
    return `<div class="session-day">
      <div class="session-day-header"><span>${formatDateFriendly(date)}</span><span>${formatHM(totalMs)}</span></div>
      ${sessions.map(s => {
        const subj = state.subjects.find(x => x.id === s.subjectId);
        const c = subj ? colorForSubject(subj) : '#8b80a8';
        return `
        <div class="session-item">
          <div class="session-dot ${s.status}"></div>
          <div class="session-info">
            <div class="session-sub" style="color:${c};">${escHtml(getSubjectName(s.subjectId))}</div>
            <div class="session-task">${escHtml(s.taskName)}</div>
          </div>
          <div class="session-dur">${s.status === 'done' ? formatHM(s.duration) : s.status}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

// ===================== ATTENDANCE =====================
let attMonthOffset = 0; // 0 = current month, -1 = last month, etc.

function changeAttMonth(dir) {
  const newOffset = attMonthOffset + dir;
  if (newOffset > 0) return; // can't go beyond current month
  attMonthOffset = newOffset;
  renderAttendance();
}

function renderAttendance() {
  const base = new Date();
  const viewDate = new Date(base.getFullYear(), base.getMonth() + attMonthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  document.getElementById('att-month-title').textContent = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextBtn = document.getElementById('att-next-btn');
  if (nextBtn) nextBtn.style.opacity = attMonthOffset >= 0 ? '0.25' : '1';
  if (nextBtn) nextBtn.style.pointerEvents = attMonthOffset >= 0 ? 'none' : 'auto';
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const todayKey = toDateKey(now);
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const isCurrentMonthView = attMonthOffset === 0;
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build leave date set
  const leaveDates = new Set();
  state.leaves.forEach(l => {
    let d = new Date(l.startDate);
    while (d <= new Date(l.endDate)) {
      leaveDates.add(toDateKey(d));
      d.setDate(d.getDate() + 1);
    }
  });

  let cal = '';
  for (let i = 0; i < firstDay; i++) cal += '<div class="att-day" style="background:transparent;"></div>';
  let presentCount = 0, leaveCount = 0, absentCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthStr}-${String(d).padStart(2,'0')}`;
    const isFuture = key > todayKey;
    const isToday = key === todayKey;
    let cls = 'att-day', label = d;
    if (isFuture) {
      cls += ' future';
    } else if (leaveDates.has(key)) {
      cls += ' leave'; leaveCount++;
    } else if (state.attendance.find(a => a.date === key && a.status === 'present')) {
      cls += ' present'; presentCount++;
    } else {
      cls += ' absent'; absentCount++;
    }
    if (isToday) cls += ' today';
    cal += `<div class="${cls}" title="${key}">${label}</div>`;
  }
  document.getElementById('att-calendar').innerHTML = cal;
  document.getElementById('att-present-count').textContent = presentCount;
  document.getElementById('att-leave-count').textContent = leaveCount;
  document.getElementById('att-absent-count').textContent = absentCount;
  const total = presentCount + leaveCount + absentCount;
  const rate = total > 0 ? Math.round(((presentCount + leaveCount) / total) * 100) : 0;
  document.getElementById('att-rate-text').textContent = rate + '%';

  // Animate presence ring
  const ring = document.getElementById('att-ring-progress');
  if (ring) {
    const circ = 283;
    ring.style.strokeDashoffset = String(circ - (circ * rate) / 100);
  }

  const statsTitle = document.getElementById('att-stats-title');
  if (statsTitle) statsTitle.textContent = isCurrentMonthView ? 'This Month' : monthLabel;

  // ── Login/Logout History for today ──────────────────────────────────────
  const historyEl = document.getElementById('att-login-history');
  if (historyEl) {
    const todayAtt = state.attendance.find(a => a.date === todayKey);
    const hist = todayAtt && todayAtt.history ? todayAtt.history : [];
    if (hist.length === 0) {
      historyEl.innerHTML = '<div class="att-empty">No check-ins yet today</div>';
    } else {
      historyEl.innerHTML = `<div class="att-timeline">${hist.map(h => {
        const isLogin = h.type === 'login';
        return `
        <div class="att-tl-item">
          <div class="att-tl-dot ${isLogin ? 'login' : 'logout'}"></div>
          <div>
            <div class="att-tl-label">${isLogin ? 'Checked in' : 'Checked out'}</div>
            <div class="att-tl-sub">${isLogin ? 'Session started' : 'Session ended'}</div>
          </div>
          <div class="att-tl-time">${h.time}</div>
        </div>`;
      }).join('')}</div>`;
    }
  }

  // ── Monthly attendance list (last 15 present days) ───────────────────────
  const attListEl = document.getElementById('att-recent-list');
  if (attListEl) {
    const monthAtts = state.attendance
      .filter(a => a.date.startsWith(monthStr) && a.status === 'present')
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 15);
    const chip = document.getElementById('att-records-chip');
    if (chip) chip.textContent = monthAtts.length ? `${monthAtts.length} days` : 'Recent';
    if (monthAtts.length === 0) {
      attListEl.innerHTML = '<div class="att-empty">No records this month</div>';
    } else {
      attListEl.innerHTML = monthAtts.map(a => {
        const hist = a.history || [];
        const pills = hist.length > 0
          ? hist.map(h => `<span class="att-pill ${h.type==='login'?'in':'out'}">${h.type==='login'?'IN':'OUT'} ${h.time}</span>`).join('')
          : `<span class="att-pill in">IN ${a.loginTime||'—'}</span>${a.logoutTime ? `<span class="att-pill out">OUT ${a.logoutTime}</span>` : ''}`;
        const pretty = new Date(a.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<div class="att-record">
          <div class="att-record-date">${pretty}</div>
          <div class="att-record-pills">${pills}</div>
        </div>`;
      }).join('');
    }
  }

  // Leaves list — filter to leaves that overlap the viewed month, most recent first
  const leaveList = document.getElementById('leave-list');
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2,'0')}`;
  const monthLeaves = state.leaves.filter(l => l.startDate <= monthEnd && l.endDate >= monthStart);
  if (monthLeaves.length === 0) {
    leaveList.innerHTML = `<div class="empty-state"><div class="empty-icon">🏖</div><div class="empty-text">No leaves in ${monthLabel}</div></div>`;
  } else {
    leaveList.innerHTML = [...monthLeaves].reverse().map(l => {
      const realIdx = state.leaves.indexOf(l);
      return `
      <div class="leave-item">
        <div>
          <div class="leave-dates">${l.startDate} → ${l.endDate}</div>
          <div class="leave-reason">${escHtml(l.reason)}</div>
        </div>
        <div class="leave-badge">Leave</div>
        <button class="btn-icon danger" onclick="deleteLeave(${realIdx})" style="margin-left:8px;">✕</button>
      </div>`;
    }).join('');
  }

  // Next leave
  const upcoming = state.leaves.filter(l => l.startDate >= toDateKey(now));
  document.getElementById('next-leave-info').textContent = upcoming.length > 0
    ? `Next leave: ${upcoming[0].startDate}` : 'No upcoming leaves';
}

function openLeaveModal() {
  document.getElementById('leave-start').value = '';
  document.getElementById('leave-end').value = '';
  document.getElementById('leave-reason').value = '';
  openModal('modal-leave');
}

function applyLeave() {
  const start = document.getElementById('leave-start').value;
  const end = document.getElementById('leave-end').value;
  const reason = document.getElementById('leave-reason').value.trim();
  if (!start || !end) { showToast('Select start and end dates', 'error'); return; }
  if (end < start) { showToast('End date must be after start', 'error'); return; }
  if (!reason) { showToast('Enter a reason', 'error'); return; }
  state.leaves.push({ startDate: start, endDate: end, reason });
  saveData('leaves');
  closeModal('modal-leave');
  renderAttendance();
  showToast('Leave applied', 'success');
}

function deleteLeave(idx) {
  if (!confirm('Remove this leave record?')) return;
  state.leaves.splice(idx, 1);
  saveData('leaves');
  renderAttendance();
  showToast('Leave removed');
}

// ===================== NOTES =====================
const NOTE_TYPE_META = {
  note:     { icon: '📝', color: '#38bdf8', label: 'Note' },
  task:     { icon: '✅', color: '#22c55e', label: 'Task' },
  idea:     { icon: '💡', color: '#f59e0b', label: 'Idea' },
  reminder: { icon: '⏰', color: '#ec4899', label: 'Reminder' }
};

function renderNotes() {
  const list = document.getElementById('notes-list');
  if (!list) return;
  const search = (document.getElementById('notes-search')?.value || '').toLowerCase();
  const filterType = document.getElementById('notes-filter-type')?.value || '';
  let notes = [...state.notes].reverse().filter(n => {
    if (filterType && n.type !== filterType) return false;
    if (search && !n.title.toLowerCase().includes(search) && !(n.content||'').toLowerCase().includes(search)) return false;
    return true;
  });
  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🗒</div><div class="empty-text">No notes found</div></div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const meta = NOTE_TYPE_META[n.type] || NOTE_TYPE_META.note;
    return `<div class="task-item" style="align-items:flex-start;">
      <div style="font-size:1.1rem;flex-shrink:0;margin-top:2px;">${meta.icon}</div>
      <div class="task-info">
        <div class="task-name">${escHtml(n.title)}</div>
        ${n.content ? `<div style="font-size:0.82rem;color:var(--muted);margin-top:4px;line-height:1.5;white-space:pre-wrap;">${escHtml(n.content)}</div>` : ''}
        <div class="task-tags">
          <span class="tag" style="background:${meta.color}26;color:${meta.color};">${meta.label}</span>
          <span style="font-size:0.7rem;color:var(--muted2);">${n.date}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon" onclick="openNoteModal('${n.id}')">✏</button>
        <button class="btn-icon danger" onclick="deleteNote('${n.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function openNoteModal(id) {
  document.getElementById('note-modal-title').textContent = id ? 'Edit Note' : 'New Note';
  document.getElementById('edit-note-id').value = id || '';
  if (id) {
    const n = state.notes.find(n => n.id === id);
    if (!n) return;
    document.getElementById('note-type-input').value = n.type;
    document.getElementById('note-title-input').value = n.title;
    document.getElementById('note-content-input').value = n.content || '';
  } else {
    document.getElementById('note-type-input').value = 'note';
    document.getElementById('note-title-input').value = '';
    document.getElementById('note-content-input').value = '';
  }
  openModal('modal-note');
}

function saveNote() {
  const id = document.getElementById('edit-note-id').value;
  const title = document.getElementById('note-title-input').value.trim();
  if (!title) { showToast('Title required', 'error'); return; }
  const type = document.getElementById('note-type-input').value;
  const content = document.getElementById('note-content-input').value.trim();
  if (id) {
    const n = state.notes.find(n => n.id === id);
    if (n) { n.type = type; n.title = title; n.content = content; }
  } else {
    state.notes.push({
      id: 'note_' + Date.now(),
      type, title, content,
      date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    });
  }
  saveData('notes');
  closeModal('modal-note');
  renderNotes();
  showToast(id ? 'Note updated' : 'Note added', 'success');
}

function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  state.notes = state.notes.filter(n => n.id !== id);
  saveData('notes');
  renderNotes();
  showToast('Note deleted');
}

// ===================== COMMUNITY =====================
let pendingAttachments = [];
let currentAttachType = null;
let editingPostId = null;

function editPost(id) {
  const p = state.posts.find(p => p.id === id);
  if (!p) return;
  editingPostId = id;
  document.getElementById('post-description').value = p.description || '';
  pendingAttachments = [...p.attachments];
  renderAttachPreview();
  document.querySelector('.post-form-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const btn = document.getElementById('post-submit-btn');
  if (btn) btn.textContent = 'Update Post';
  showToast('Editing post — make changes and update');
}

function addAttachment(type) {
  currentAttachType = type;
  document.getElementById('add-attach-title').textContent = { prompt: 'Add Prompt', pdf: 'Add PDF', image: 'Add Image', note: 'Add Note' }[type];
  document.getElementById('attach-name-input').value = '';
  document.getElementById('attach-content-input').value = '';
  document.getElementById('attach-file-input').value = '';
  document.getElementById('attach-file-name').textContent = '';
  const imgPrev = document.getElementById('attach-image-preview');
  imgPrev.style.display = 'none';
  imgPrev.src = '';
  const cf = document.getElementById('attach-content-field');
  const ff = document.getElementById('attach-file-field');
  const fileInput = document.getElementById('attach-file-input');
  if (type === 'pdf') {
    cf.style.display = 'none';
    ff.style.display = 'block';
    fileInput.accept = 'application/pdf';
    document.getElementById('attach-file-label').textContent = 'Upload PDF';
  } else if (type === 'image') {
    cf.style.display = 'none';
    ff.style.display = 'block';
    fileInput.accept = 'image/*';
    document.getElementById('attach-file-label').textContent = 'Upload Image';
  } else {
    cf.style.display = 'block';
    ff.style.display = 'none';
  }
  openModal('modal-add-attach');
}

document.getElementById('attach-file-input')?.addEventListener('change', function() {
  const f = this.files[0];
  const imgPrev = document.getElementById('attach-image-preview');
  document.getElementById('attach-file-name').textContent = f ? `📎 ${f.name} (${(f.size/1024).toFixed(0)} KB)` : '';
  if (f && currentAttachType === 'image' && f.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { imgPrev.src = e.target.result; imgPrev.style.display = 'block'; };
    reader.readAsDataURL(f);
  } else {
    imgPrev.style.display = 'none';
  }
});

function confirmAddAttachment() {
  const name = document.getElementById('attach-name-input').value.trim();
  if (!name) { showToast('Enter a name', 'error'); return; }
  if (currentAttachType === 'pdf' || currentAttachType === 'image') {
    const file = document.getElementById('attach-file-input').files[0];
    if (!file) { showToast(`Choose ${currentAttachType === 'pdf' ? 'a PDF' : 'an image'} file to upload`, 'error'); return; }
    const maxSize = currentAttachType === 'pdf' ? 4 * 1024 * 1024 : 3 * 1024 * 1024;
    if (file.size > maxSize) { showToast(`File too large (max ${maxSize/1024/1024}MB)`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
      pendingAttachments.push({ type: currentAttachType, name, content: '', fileData: e.target.result, fileName: file.name });
      closeModal('modal-add-attach');
      renderAttachPreview();
      showToast(currentAttachType === 'pdf' ? 'PDF attached' : 'Image attached');
    };
    reader.onerror = function() { showToast('Could not read file', 'error'); };
    reader.readAsDataURL(file);
    return;
  }
  const content = document.getElementById('attach-content-input').value.trim();
  pendingAttachments.push({ type: currentAttachType, name, content });
  closeModal('modal-add-attach');
  renderAttachPreview();
  showToast('Attachment added');
}

function renderAttachPreview() {
  const icons = { prompt: '📋', pdf: '📄', image: '🖼', note: '📝' };
  document.getElementById('attach-preview').innerHTML = pendingAttachments.map((a, i) =>
    a.type === 'image' && a.fileData
      ? `<div class="attach-chip" style="padding:3px;"><img src="${a.fileData}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;vertical-align:middle;"> ${escHtml(a.name)}<span class="remove" onclick="removeAttach(${i})">×</span></div>`
      : `<div class="attach-chip">${icons[a.type]} ${escHtml(a.name)}<span class="remove" onclick="removeAttach(${i})">×</span></div>`
  ).join('');
}

function removeAttach(i) {
  pendingAttachments.splice(i, 1);
  renderAttachPreview();
}

function submitPost() {
  const desc = document.getElementById('post-description').value.trim();
  if (!desc && pendingAttachments.length === 0) { showToast('Add content before posting', 'error'); return; }
  if (editingPostId) {
    const p = state.posts.find(p => p.id === editingPostId);
    if (p) {
      p.description = desc;
      p.attachments = [...pendingAttachments];
      saveData('posts');
      showToast('Post updated', 'success');
    }
  } else {
    const post = {
      id: 'post_' + Date.now(),
      username: state.user.name,
      description: desc,
      attachments: [...pendingAttachments],
      date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    state.posts.unshift(post);
    saveData('posts');
    showToast('Post published!', 'success');
  }
  clearPostForm();
  renderPosts();
}

function clearPostForm() {
  document.getElementById('post-description').value = '';
  pendingAttachments = [];
  editingPostId = null;
  const btn = document.getElementById('post-submit-btn');
  if (btn) btn.textContent = 'Publish Post';
  renderAttachPreview();
}

function renderPosts() {
  const feed = document.getElementById('posts-feed');
  if (!feed) return;
  if (state.posts.length === 0) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-icon">🌐</div><div class="empty-text">No posts yet — be the first to share!</div></div>';
    return;
  }
  const icons = { prompt: '📋', pdf: '📄', image: '🖼', note: '📝' };
  const typeClass = { prompt: 'type-prompt', pdf: 'type-pdf', image: 'type-image', note: 'type-note' };
  feed.innerHTML = state.posts.map(p => {
    const initials = p.username.slice(0,2).toUpperCase();
    const attHtml = p.attachments.map((a, ai) =>
      a.type === 'image' && a.fileData
        ? `<div class="post-attach-chip ${typeClass[a.type]}" onclick="viewAttachment('${p.id}', ${ai})" style="padding:5px 10px 5px 5px;">
            <img src="${a.fileData}" style="width:26px;height:26px;border-radius:5px;object-fit:cover;flex-shrink:0;">
            <span class="chip-name">${escHtml(a.name)}</span>
          </div>`
        : `<div class="post-attach-chip ${typeClass[a.type]}" onclick="viewAttachment('${p.id}', ${ai})">
        <span class="chip-icon">${icons[a.type]}</span>
        <span class="chip-name">${escHtml(a.name)}</span>
      </div>`).join('');
    return `<div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${initials}</div>
        <div class="post-meta">
          <div class="post-username">${escHtml(p.username)}</div>
          <div class="post-date">${escHtml(p.date)}</div>
        </div>
        ${p.username === state.user?.name ? `<button class="btn-icon" onclick="editPost('${p.id}')" style="margin-left:auto;">✏</button><button class="btn-icon danger" onclick="deletePost('${p.id}')">🗑</button>` : ''}
      </div>
      ${p.description ? `<div class="post-description">${escHtml(p.description)}</div>` : ''}
      ${p.attachments.length > 0 ? `<div class="post-attachments">${attHtml}</div>` : ''}
    </div>`;
  }).join('');
}

function viewAttachment(postId, idx) {
  const p = state.posts.find(p => p.id === postId);
  if (!p) return;
  const a = p.attachments[idx];
  if (!a) return;
  if (a.type === 'prompt') {
    document.getElementById('prompt-content-view').textContent = a.content || '(No content)';
    openModal('modal-prompt');
  } else {
    document.getElementById('attach-modal-title').textContent = { pdf: '📄 PDF', image: '🖼 Image', note: '📝 Note' }[a.type] + ': ' + a.name;
    const body = document.getElementById('attach-modal-body');
    if (a.type === 'note') {
      body.innerHTML = `<div style="background:var(--bg3);padding:14px;border-radius:var(--radius-sm);font-size:0.88rem;line-height:1.7;white-space:pre-wrap;">${escHtml(a.content || '')}</div>`;
    } else if (a.type === 'pdf' && a.fileData) {
      body.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:3rem;margin-bottom:12px;">📄</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:6px;">${escHtml(a.name)}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-bottom:18px;">${escHtml(a.fileName || '')}</div>
        <a href="${a.fileData}" download="${escHtml(a.fileName || a.name + '.pdf')}" class="btn-accent" style="display:inline-block;text-decoration:none;">⬇ Download PDF</a>
      </div>`;
    } else if (a.type === 'image' && a.fileData) {
      body.innerHTML = `<div style="text-align:center;">
        <img src="${a.fileData}" style="max-width:100%;max-height:360px;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:14px;">${escHtml(a.name)}</div>
        <a href="${a.fileData}" download="${escHtml(a.fileName || a.name + '.png')}" class="btn-accent" style="display:inline-block;text-decoration:none;">⬇ Download Image</a>
      </div>`;
    } else {
      body.innerHTML = `<div style="text-align:center;padding:20px;">
        <div style="font-size:3rem;margin-bottom:12px;">${a.type === 'pdf' ? '📄' : '🖼'}</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:6px;">${escHtml(a.name)}</div>
        <div style="font-size:0.8rem;color:var(--muted);">Reference only — no file attached</div>
      </div>`;
    }
    openModal('modal-attachment');
  }
}

function copyPrompt() {
  const content = document.getElementById('prompt-content-view').textContent;
  navigator.clipboard.writeText(content).then(() => showToast('Prompt copied!', 'success'));
}

function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  state.posts = state.posts.filter(p => p.id !== id);
  saveData('posts');
  renderPosts();
  showToast('Post deleted');
}

// ===================== ANALYTICS =====================
let analyticsRange = 6; // months: 1, 3, 6, 12, or 'all'

function setAnalyticsRange(range) {
  analyticsRange = range;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.range-btn[data-range="${range}"]`)?.classList.add('active');
  renderAnalytics();
}

function getRangeStartDate() {
  if (analyticsRange === 'all') {
    if (state.sessions.length === 0) return new Date();
    const dates = state.sessions.map(s => s.date).sort();
    return new Date(dates[0] + 'T00:00:00');
  }
  const d = new Date();
  d.setMonth(d.getMonth() - Number(analyticsRange));
  return d;
}

function lookupSpecificDay() {
  const dateStr = document.getElementById('analytics-day-picker').value;
  const resultDiv = document.getElementById('day-lookup-result');
  if (!dateStr) { resultDiv.style.display = 'none'; return; }
  const daySessions = state.sessions.filter(s => s.date === dateStr);
  const doneSessions = daySessions.filter(s => s.status === 'done');
  const totalMs = doneSessions.reduce((a, s) => a + s.duration, 0);
  const att = state.attendance.find(a => a.date === dateStr);
  const onLeave = state.leaves.some(l => dateStr >= l.startDate && dateStr <= l.endDate);
  const friendlyDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let attendanceText = 'Absent';
  let statusClass = 'absent';
  if (onLeave) { attendanceText = 'On Leave'; statusClass = 'leave'; }
  else if (att && att.status === 'present') {
    attendanceText = `Present · ${att.loginTime || '—'} → ${att.logoutTime || 'still in'}`;
    statusClass = 'present';
  }

  const sessionRows = doneSessions.map(s => {
    const subj = state.subjects.find(x => x.id === s.subjectId);
    const c = subj ? colorForSubject(subj) : '#a78bfa';
    return `<div class="an-day-session">
      <span class="an-day-subj" style="color:${c};">${escHtml(getSubjectName(s.subjectId))}</span>
      <span class="an-day-task">${escHtml(s.taskName)}</span>
      <span class="an-day-dur">${formatHM(s.duration)}</span>
    </div>`;
  }).join('');

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `<div class="day-lookup-card">
    <div class="an-day-head">
      <div class="an-day-date">${friendlyDate}</div>
      <div class="an-day-status ${statusClass}">${attendanceText}</div>
    </div>
    <div class="an-day-metrics" style="margin-bottom:${sessionRows ? '12px' : '0'};">
      <div>
        <div class="an-day-metric-val">${formatHM(totalMs)}</div>
        <div class="an-day-metric-lbl">Studied</div>
      </div>
      <div>
        <div class="an-day-metric-val" style="color:#c4b5fd;">${doneSessions.length}</div>
        <div class="an-day-metric-lbl">Sessions</div>
      </div>
    </div>
    ${sessionRows ? `<div>${sessionRows}</div>` : '<div class="an-day-empty">No study sessions recorded this day</div>'}
  </div>`;
}

function renderAnalytics() {
  // Destroy old charts
  Object.values(state.analyticsCharts).forEach(c => { try { c.destroy(); } catch {} });
  state.analyticsCharts = {};

  const startDate = getRangeStartDate();
  const startKey = toDateKey(startDate);
  const rangeSessions = state.sessions.filter(s => s.status === 'done' && s.date >= startKey);
  const rangeMs = rangeSessions.reduce((a, s) => a + s.duration, 0);
  const avgProgress = state.subjects.length
    ? Math.round(state.subjects.reduce((a, s) => a + calcSubjectProgress(s), 0) / state.subjects.length)
    : 0;
  const taskTotal = state.tasks.length;
  const taskDone = state.tasks.filter(t => t.status === 'completed').length;
  const taskPct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  const rangeLabels = { 1: 'Last 1 Month', 3: 'Last 3 Months', 6: 'Last 6 Months', 12: 'Last 1 Year', all: 'All Time' };
  const rangeLabelEl = document.getElementById('an-range-label');
  if (rangeLabelEl) rangeLabelEl.textContent = rangeLabels[analyticsRange] || 'Selected Range';

  const kpiHours = document.getElementById('an-kpi-hours');
  const kpiSessions = document.getElementById('an-kpi-sessions');
  const kpiProgress = document.getElementById('an-kpi-progress');
  const kpiTasks = document.getElementById('an-kpi-tasks');
  if (kpiHours) kpiHours.textContent = formatHM(rangeMs);
  if (kpiSessions) kpiSessions.textContent = String(rangeSessions.length);
  if (kpiProgress) kpiProgress.textContent = avgProgress + '%';
  if (kpiTasks) kpiTasks.textContent = taskPct + '%';

  const tick = '#9b8fc4';
  const grid = 'rgba(180,160,220,0.08)';
  const cOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: tick, font: { size: 11 } } } },
    scales: {
      x: { grid: { color: grid }, ticks: { color: tick, font: { size: 10 } } },
      y: { grid: { color: grid }, ticks: { color: tick, font: { size: 10 } }, beginAtZero: true }
    }
  };

  // Subject performance
  const subjCtx = document.getElementById('analytics-subjects-chart');
  if (subjCtx && state.subjects.length > 0) {
    const colors = state.subjects.map(s => colorForSubject(s));
    state.analyticsCharts.subj = new Chart(subjCtx, {
      type: 'bar',
      data: {
        labels: state.subjects.map(s => s.name),
        datasets: [{ label: 'Progress %', data: state.subjects.map(s => calcSubjectProgress(s)), backgroundColor: colors.map(c => c + '99'), borderColor: colors, borderWidth: 1, borderRadius: 6 }]
      },
      options: { ...cOpts, plugins: { ...cOpts.plugins }, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } }
    });
  }

  // Study hours trend — granularity adapts to selected range
  const weekCtx = document.getElementById('analytics-weekly-chart');
  const titleEl = document.getElementById('weekly-chart-title');
  if (weekCtx) {
    const now = new Date();
    const totalDays = Math.max(1, Math.round((now - startDate) / 86400000));
    let labels = [], data = [];

    if (analyticsRange === 1 || totalDays <= 31) {
      // Daily granularity
      if (titleEl) titleEl.textContent = 'Daily Study Hours (Last 30 Days)';
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = toDateKey(d);
        labels.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        const ms = state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
        data.push(Math.round(ms / 3600000 * 10) / 10);
      }
    } else if (totalDays <= 200) {
      // Weekly buckets
      if (titleEl) titleEl.textContent = 'Weekly Study Hours';
      const numWeeks = Math.ceil(totalDays / 7);
      for (let w = numWeeks - 1; w >= 0; w--) {
        const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() - (w * 7));
        const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6);
        labels.push(weekStart.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        let ms = 0;
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const key = toDateKey(d);
          ms += state.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
        }
        data.push(Math.round(ms / 3600000 * 10) / 10);
      }
    } else {
      // Monthly buckets
      if (titleEl) titleEl.textContent = 'Monthly Study Hours Trend';
      const numMonths = Math.ceil(totalDays / 30);
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        const ms = state.sessions.filter(s => s.date.startsWith(key) && s.status === 'done').reduce((a, s) => a + s.duration, 0);
        data.push(Math.round(ms / 3600000 * 10) / 10);
      }
    }

    state.analyticsCharts.week = new Chart(weekCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Hours', data,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56,189,248,0.14)',
          fill: true, tension: 0.35,
          pointBackgroundColor: '#7dd3fc',
          pointRadius: labels.length > 20 ? 0 : 3
        }]
      },
      options: cOpts
    });
  }

  // Task breakdown
  const taskCtx = document.getElementById('analytics-tasks-chart');
  if (taskCtx) {
    const done = state.tasks.filter(t => t.status === 'completed').length;
    const pend = state.tasks.filter(t => t.status === 'pending').length;
    const can = state.tasks.filter(t => t.status === 'cancelled').length;
    state.analyticsCharts.tasks = new Chart(taskCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Cancelled'],
        datasets: [{
          data: [done, pend, can],
          backgroundColor: ['rgba(52,211,153,0.75)', 'rgba(251,191,36,0.75)', 'rgba(251,113,133,0.75)'],
          borderColor: ['#34d399', '#fbbf24', '#fb7185'],
          borderWidth: 1
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tick, font: { size: 11 } } } } }
    });
  }

  // Monthly study — respects selected range (capped 3-24 months for readability)
  const monthCtx = document.getElementById('analytics-monthly-chart');
  if (monthCtx) {
    const now = new Date();
    const monthCount = analyticsRange === 'all' ? Math.min(24, Math.max(3, Math.ceil((now - getRangeStartDate()) / 30 / 86400000))) : Math.max(3, Number(analyticsRange) || 6);
    const months = [];
    const data = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      const ms = state.sessions.filter(s => s.date.startsWith(key) && s.status === 'done').reduce((a, s) => a + s.duration, 0);
      data.push(Math.round(ms / 3600000 * 10) / 10);
    }
    state.analyticsCharts.monthly = new Chart(monthCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Hours', data,
          backgroundColor: 'rgba(167,139,250,0.55)',
          borderColor: '#a78bfa',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: cOpts
    });
  }
}

// ===================== OWNER PANEL =====================
let ownerState = {
  selectedStudent: null,
  studentData: null,
  charts: {}
};

function showOwnerPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('visible');
  document.getElementById('owner-panel').classList.add('visible');
  S.set('los_owner_session', true);
  renderOwnerStudentList();
  ownerBackToOverview();
}

async function ownerLogout() {
  S.del('los_owner_session');
  document.getElementById('owner-panel').classList.remove('visible');
  ownerState = { selectedStudent: null, studentData: null, charts: {} };
  try {
    await window._auth.signOut();
  } catch(e) {
    document.getElementById('login-screen').style.display = 'flex';
  }
}

function toggleOwnerSidebar() {
  document.getElementById('owner-sidebar').classList.toggle('open');
}

async function getAllStudents() {
  // Returns array of { uid, displayName, email, lastLogin, role }
  try {
    const users = await fbGetAllUsers();
    // Filter out owner email and role:owner accounts from student list
    return users
      .filter(u => u.role !== 'owner' && u.email !== 'owner@gmail.com')
      .sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
  } catch(e) { return []; }
}

async function loadStudentData(uid) {
  const data = await fbLoadUserData(uid);
  let meta = {};
  try {
    const metaSnap = await window._db.collection('users').doc(uid).get();
    if (metaSnap.exists) meta = metaSnap.data();
  } catch(e) {}
  return {
    uid,
    name: meta.displayName || uid,
    email: meta.email || '',
    lastLogin: meta.lastLogin || null,
    subjects: data.subjects || [],
    tasks: data.tasks || [],
    sessions: data.sessions || [],
    attendance: data.attendance || [],
    leaves: data.leaves || [],
    notes: data.notes || [],
    activeTimers: data.activeTimers || [],
    isOnline: window._fbUser && window._fbUser.uid === uid
  };
}

function studentOverallProgress(data) {
  if (!data.subjects || data.subjects.length === 0) return 0;
  const sum = data.subjects.reduce((a, s) => a + calcSubjectProgress(s), 0);
  return Math.round(sum / data.subjects.length);
}

function studentTotalStudyMs(data) {
  return data.sessions.filter(s => s.status === 'done').reduce((a, s) => a + s.duration, 0);
}

async function renderOwnerStudentList() {
  const search = (document.getElementById('owner-student-search')?.value || '').toLowerCase();
  const list = document.getElementById('owner-student-list');
  if (!list) return;
  list.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:0.82rem;">Loading…</div>';
  const students = await getAllStudents();
  const filtered = students.filter(s => (s.displayName||'').toLowerCase().includes(search) || (s.email||'').toLowerCase().includes(search));
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:24px 8px;"><div class="empty-icon" style="font-size:1.6rem;">🔍</div><div class="empty-text">No students found</div></div>';
    return;
  }
  list.innerHTML = filtered.map(s => {
    const isActive = ownerState.selectedStudent === s.uid;
    const isOnline = window._fbUser && window._fbUser.uid === s.uid;
    const initials = (s.displayName||'?').slice(0,2).toUpperCase();
    return `<div class="owner-student-card ${isActive ? 'active' : ''}" onclick="ownerSelectStudent('${s.uid}','${escHtml(s.displayName||s.email)}')">
      <div class="owner-student-avatar">${escHtml(initials)}</div>
      <div class="owner-student-info">
        <div class="owner-student-name">${escHtml(s.displayName||s.email)}</div>
        <div class="owner-student-meta">${isOnline ? 'Online now' : (s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : 'Never logged in')}</div>
      </div>
      ${isOnline ? '<div class="owner-student-online-dot"></div>' : ''}
    </div>`;
  }).join('');
}

function ownerBackToOverview() {
  ownerState.selectedStudent = null;
  document.getElementById('owner-view-overview').style.display = 'block';
  document.getElementById('owner-view-student').style.display = 'none';
  renderOwnerStudentList();
  renderOwnerOverview();
  document.getElementById('owner-sidebar').classList.remove('open');
}

async function renderOwnerOverview() {
  const table = document.getElementById('owner-overview-table');
  const statsEl = document.getElementById('owner-summary-stats');
  if (statsEl) statsEl.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;">Loading…</div>';
  if (table) table.innerHTML = '';

  const students = await getAllStudents();
  const allData = await Promise.all(students.map(s => loadStudentData(s.uid)));

  const totalStudents = allData.length;
  const totalStudyMs = allData.reduce((a, d) => a + studentTotalStudyMs(d), 0);
  const avgProgress = totalStudents > 0 ? Math.round(allData.reduce((a, d) => a + studentOverallProgress(d), 0) / totalStudents) : 0;
  const totalTasks = allData.reduce((a, d) => a + d.tasks.length, 0);
  const completedTasks = allData.reduce((a, d) => a + d.tasks.filter(t => t.status === 'completed').length, 0);

  if (statsEl) statsEl.innerHTML = `
    <div class="stat-pill"><div class="stat-value">${totalStudents}</div><div class="stat-label">Total Students</div></div>
    <div class="stat-pill"><div class="stat-value">${avgProgress}%</div><div class="stat-label">Avg Progress</div></div>
    <div class="stat-pill"><div class="stat-value">${formatHM(totalStudyMs)}</div><div class="stat-label">Total Study Time</div></div>
    <div class="stat-pill"><div class="stat-value">${completedTasks}/${totalTasks}</div><div class="stat-label">Tasks Completed</div></div>
  `;

  if (!table) return;
  if (totalStudents === 0) {
    table.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No students have signed up yet</div></div>';
    return;
  }
  table.innerHTML = allData.map(d => {
    const pct = studentOverallProgress(d);
    const isOnline = window._fbUser && window._fbUser.uid === d.uid;
    const doneTasks = d.tasks.filter(t => t.status === 'completed').length;
    return `<div class="owner-overview-row" onclick="ownerSelectStudent('${d.uid}','${escHtml(d.name)}')">
      <div class="owner-student-avatar" style="margin:0;">${escHtml((d.name||'?').slice(0,2).toUpperCase())}</div>
      <span class="ov-name">${escHtml(d.name)} ${isOnline ? '<span style="color:var(--success);font-size:0.7rem;">● online</span>' : ''}</span>
      <div class="ov-bar-track"><div class="ov-bar-fill" style="width:${pct}%;"></div></div>
      <span class="ov-pct">${pct}%</span>
      <span class="ov-stat">${formatHM(studentTotalStudyMs(d))}</span>
      <span class="ov-stat">${doneTasks}/${d.tasks.length} tasks</span>
      <button class="btn-icon" style="margin-left:4px;">View →</button>
    </div>`;
  }).join('');
}

async function ownerSelectStudent(uid, displayName) {
  ownerState.selectedStudent = uid;
  document.getElementById('owner-view-overview').style.display = 'none';
  document.getElementById('owner-view-student').style.display = 'block';
  document.getElementById('owner-student-name-title').textContent = displayName || uid;
  document.getElementById('owner-sidebar').classList.remove('open');
  document.getElementById('owner-main').scrollTop = 0;
  // Show loading state
  const detailEl = document.getElementById('owner-student-detail-content');
  if (detailEl) detailEl.innerHTML = '<div style="padding:32px;color:var(--muted);text-align:center;">Loading student data…</div>';
  ownerState.studentData = await loadStudentData(uid);
  renderOwnerStudentList();
  renderOwnerStudentDetail();
}

function renderOwnerStudentDetail() {
  const d = ownerState.studentData;
  if (!d) return;

  // Meta bar (login info / online status)
  const isOnline = window._fbUser && window._fbUser.uid === d.uid;
  const lastLoginStr = d.lastLogin ? new Date(d.lastLogin).toLocaleString() : '—';
  document.getElementById('owner-dash-meta').innerHTML = `
    <div class="meta-item"><div class="meta-val">${isOnline ? '🟢 Online' : '⚪ Offline'}</div><div class="meta-lbl">Status</div></div>
    <div class="meta-divider"></div>
    <div class="meta-item"><div class="meta-val" style="font-size:0.8rem;">${escHtml(lastLoginStr)}</div><div class="meta-lbl">Last Login</div></div>
    <div class="meta-divider"></div>
    <div class="meta-item"><div class="meta-val">${d.subjects.length}</div><div class="meta-lbl">Subjects</div></div>
    <div class="meta-divider"></div>
    <div class="meta-item"><div class="meta-val">${d.sessions.filter(s=>s.status==='done').length}</div><div class="meta-lbl">Sessions Logged</div></div>
  `;

  // Overall progress ring
  const overall = studentOverallProgress(d);
  ownerSetRoundProgress('owner-overall-circle', 'owner-overall-pct', overall);

  // Attendance ring (current month)
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const daysElapsed = now.getDate();
  const presentDays = d.attendance.filter(a => a.date.startsWith(monthStr) && a.status === 'present').length;
  const leaveDays = d.leaves.filter(l => {
    const s = new Date(l.startDate), e = new Date(l.endDate);
    return s <= now && e >= new Date(monthStr + '-01');
  }).length;
  const attRate = daysElapsed > 0 ? Math.round(((presentDays + leaveDays) / daysElapsed) * 100) : 0;
  ownerSetRoundProgress('owner-att-circle', 'owner-att-pct', Math.min(100, attRate));

  // Subject list
  const subjDiv = document.getElementById('owner-subjects-list');
  if (d.subjects.length === 0) {
    subjDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">No subjects added yet</div></div>';
  } else {
    subjDiv.innerHTML = d.subjects.map(s => {
      const pct = calcSubjectProgress(s);
      const c = colorForSubject(s);
      const total = s.topics ? s.topics.length : 0;
      const done = s.topics ? s.topics.filter(t => t.done).length : 0;
      return `<div class="subject-bar-row" style="cursor:default;">
        <span class="subject-bar-name" style="color:${c};">● &nbsp;${escHtml(s.name)} <span style="color:var(--muted2);font-size:0.72rem;font-weight:400;">(${done}/${total})</span></span>
        <div class="subject-bar-track"><div class="subject-bar-fill" style="width:${pct}%;background:linear-gradient(90deg, ${c}, ${c}cc);"></div></div>
        <span class="subject-bar-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  // Task summary
  document.getElementById('owner-total-tasks').textContent = d.tasks.length;
  document.getElementById('owner-done-tasks').textContent = d.tasks.filter(t => t.status === 'completed').length;
  document.getElementById('owner-pending-tasks').textContent = d.tasks.filter(t => t.status === 'pending').length;
  document.getElementById('owner-cancel-tasks').textContent = d.tasks.filter(t => t.status === 'cancelled').length;

  renderOwnerCharts(d);
  renderOwnerAttendanceCalendar(d);
  renderOwnerLeaves(d);
  renderOwnerNotes(d);
  renderOwnerSessionHistory(d);
}

function ownerSetRoundProgress(circleId, pctId, pct) {
  const circle = document.getElementById(circleId);
  const label = document.getElementById(pctId);
  if (!circle || !label) return;
  const r = 58; const circ = 2 * Math.PI * r;
  circle.style.strokeDashoffset = circ - (pct / 100) * circ;
  label.textContent = pct + '%';
}

function renderOwnerCharts(d) {
  Object.values(ownerState.charts).forEach(c => { try { c.destroy(); } catch {} });
  ownerState.charts = {};
  const cOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8b80a8', font: { size: 11 } } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b80a8', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b80a8', font: { size: 10 } }, beginAtZero: true }
    }
  };
  const subjCtx = document.getElementById('owner-subjects-chart');
  if (subjCtx && d.subjects.length > 0) {
    const colors = d.subjects.map(s => colorForSubject(s));
    ownerState.charts.subj = new Chart(subjCtx, {
      type: 'bar',
      data: { labels: d.subjects.map(s => s.name), datasets: [{ label: 'Progress %', data: d.subjects.map(s => calcSubjectProgress(s)), backgroundColor: colors.map(c => c + '99'), borderColor: colors, borderWidth: 1, borderRadius: 5 }] },
      options: { ...cOpts, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } }
    });
  }
  const weekCtx = document.getElementById('owner-weekly-chart');
  if (weekCtx) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const now = new Date();
    const weekData = days.map((d2, i) => {
      const date = new Date(now);
      const dayOfWeek = now.getDay();
      const diff = i + 1 - (dayOfWeek === 0 ? 7 : dayOfWeek);
      date.setDate(date.getDate() + diff);
      const key = toDateKey(date);
      const ms = d.sessions.filter(s => s.date === key && s.status === 'done').reduce((a, s) => a + s.duration, 0);
      return Math.round(ms / 3600000 * 10) / 10;
    });
    ownerState.charts.week = new Chart(weekCtx, {
      type: 'line',
      data: { labels: days, datasets: [{ label: 'Hours', data: weekData, borderColor: '#9d5cf6', backgroundColor: 'rgba(124,58,237,0.15)', fill: true, tension: 0.3, pointBackgroundColor: '#c084fc' }] },
      options: cOpts
    });
  }
}

function renderOwnerAttendanceCalendar(d) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  document.getElementById('owner-att-month-title').textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(now);
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const leaveDates = new Set();
  d.leaves.forEach(l => {
    let dt = new Date(l.startDate);
    while (dt <= new Date(l.endDate)) { leaveDates.add(toDateKey(dt)); dt.setDate(dt.getDate() + 1); }
  });
  let cal = '';
  for (let i = 0; i < firstDay; i++) cal += '<div class="att-day" style="background:transparent;"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${monthStr}-${String(day).padStart(2,'0')}`;
    const isFuture = key > todayKey;
    let cls = 'att-day';
    if (isFuture) cls += ' future';
    else if (leaveDates.has(key)) cls += ' leave';
    else if (d.attendance.find(a => a.date === key && a.status === 'present')) cls += ' present';
    else cls += ' absent';
    if (key === todayKey) cls += ' today';
    cal += `<div class="${cls}">${day}</div>`;
  }
  document.getElementById('owner-att-calendar').innerHTML = cal;
}

function renderOwnerLeaves(d) {
  const div = document.getElementById('owner-leave-list');
  if (d.leaves.length === 0) {
    div.innerHTML = '<div class="empty-state"><div class="empty-icon">🏖</div><div class="empty-text">No leaves applied</div></div>';
    return;
  }
  div.innerHTML = [...d.leaves].reverse().map(l => `
    <div class="leave-item">
      <div><div class="leave-dates">📅 ${l.startDate} → ${l.endDate}</div><div class="leave-reason">${escHtml(l.reason)}</div></div>
      <div class="leave-badge">Leave</div>
    </div>`).join('');
}

function renderOwnerNotes(d) {
  const div = document.getElementById('owner-notes-list');
  if (d.notes.length === 0) {
    div.innerHTML = '<div class="empty-state"><div class="empty-icon">🗒</div><div class="empty-text">No notes</div></div>';
    return;
  }
  div.innerHTML = [...d.notes].reverse().map(n => {
    const meta = NOTE_TYPE_META[n.type] || NOTE_TYPE_META.note;
    return `<div style="padding:10px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;">
      <div style="font-size:0.85rem;font-weight:600;">${meta.icon} ${escHtml(n.title)}</div>
      ${n.content ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:3px;white-space:pre-wrap;">${escHtml(n.content)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderOwnerSessionHistory(d) {
  const list = document.getElementById('owner-session-history');
  if (d.sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⏱</div><div class="empty-text">No sessions recorded</div></div>';
    return;
  }
  const grouped = {};
  [...d.sessions].reverse().forEach(s => { if (!grouped[s.date]) grouped[s.date] = []; grouped[s.date].push(s); });
  list.innerHTML = Object.entries(grouped).slice(0, 30).map(([date, sessions]) => {
    const totalMs = sessions.filter(s => s.status === 'done').reduce((a, s) => a + s.duration, 0);
    return `<div class="session-day">
      <div class="session-day-header"><span>${formatDateFriendly(date)}</span><span>${formatHM(totalMs)}</span></div>
      ${sessions.map(s => {
        const subj = d.subjects.find(x => x.id === s.subjectId);
        const c = subj ? colorForSubject(subj) : '#8b80a8';
        return `<div class="session-item">
          <div class="session-dot ${s.status}"></div>
          <div class="session-info">
            <div class="session-sub" style="color:${c};">${escHtml(subj ? subj.name : 'General')}</div>
            <div class="session-task">${escHtml(s.taskName)}</div>
          </div>
          <div class="session-dur">${s.status === 'done' ? formatHM(s.duration) : s.status}</div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

// ===================== EXPORT =====================
function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    user: state.user?.name,
    subjects: state.subjects,
    tasks: state.tasks,
    sessions: state.sessions,
    attendance: state.attendance,
    leaves: state.leaves,
    notes: state.notes || []
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learnos-backup-${toDateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success');
}

// ===================== MODALS =====================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ===================== TOAST =====================
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===================== HELPERS =====================
function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function formatHM(ms) {
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function getSubjectName(id) {
  const s = state.subjects.find(s => s.id === id);
  return s ? s.name : 'General';
}
function formatDateFriendly(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ╔══════════════════════════════════════════════════════════════════╗
// ║         PHASE 4 — PERFORMANCE & LIGHTHOUSE                     ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── App Loader control ────────────────────────────────────────────
function setLoaderStatus(msg) {
  const el = document.getElementById('loader-status');
  if (el) el.textContent = msg;
}

function hideAppLoader() {
  const loader = document.getElementById('app-loader');
  if (!loader) return;
  loader.classList.add('hidden');
  setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 500);
}

// ── Hard timeout: if loader still showing after 10s → show login screen ──
setTimeout(() => {
  const loader = document.getElementById('app-loader');
  if (!loader || loader.classList.contains('hidden')) return;
  console.warn('[LearnOS] Loader timeout — showing login screen');
  hideAppLoader();
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.style.display = 'flex';
  const btn = document.getElementById('login-btn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Sign In / Create Account'; }
  setLoaderStatus('Ready to sign in');
}, 6000); // 6s hard timeout — show login if Firebase doesn't respond

// Show loader status updates
setLoaderStatus('Connecting…');

// ── Lazy image loading polyfill ───────────────────────────────────
if ('loading' in HTMLImageElement.prototype) {
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.src = img.dataset.src || img.src;
  });
} else {
  // Fallback for older browsers
  const lazyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) img.src = img.dataset.src;
        lazyObserver.unobserve(img);
      }
    });
  });
  document.querySelectorAll('img[loading="lazy"]').forEach(img => lazyObserver.observe(img));
}

// ── Performance: Debounce expensive renders ───────────────────────
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── Performance: RequestAnimationFrame wrapper for renders ────────
function rafRender(fn) {
  if (window.requestAnimationFrame) {
    requestAnimationFrame(fn);
  } else {
    fn();
  }
}

// ── Web Vitals tracking (LCP, FID, CLS) ──────────────────────────
(function trackWebVitals() {
  // Track Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        console.log('[Perf] LCP:', Math.round(last.startTime) + 'ms');
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Track Cumulative Layout Shift
      let clsScore = 0;
      new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) clsScore += entry.value;
        });
        console.log('[Perf] CLS:', clsScore.toFixed(4));
      }).observe({ type: 'layout-shift', buffered: true });

      // Track First Input Delay
      new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          console.log('[Perf] FID:', Math.round(entry.processingStart - entry.startTime) + 'ms');
        });
      }).observe({ type: 'first-input', buffered: true });

    } catch(e) { /* PerformanceObserver not fully supported */ }
  }
})();

// ── Lighthouse: App installable check ────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  console.log('[PWA] Install prompt fired ✅');
});

// ── Lighthouse: Page visibility — pause timers when hidden ────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause any running timers to save battery
    if (state && state.activeTimers) {
      state.activeTimers.forEach(t => {
        if (t.status === 'running') {
          t._pausedForVisibility = true;
        }
      });
    }
  } else {
    // Resume
    if (state && state.activeTimers) {
      state.activeTimers.forEach(t => {
        if (t._pausedForVisibility) {
          delete t._pausedForVisibility;
        }
      });
    }
    // Re-render dashboard when app comes back to foreground
    if (state && state.user) {
      rafRender(() => {
        const dashPage = document.getElementById('page-dashboard');
        if (dashPage && dashPage.classList.contains('active')) {
          renderDashboard();
        }
      });
    }
  }
});

// ── Lighthouse: Network info for adaptive loading ──────────────────
(function adaptiveLoading() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return;
  const slowConnection = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
  if (slowConnection) {
    console.log('[Perf] Slow connection detected — minimal mode');
    document.documentElement.classList.add('slow-connection');
  }
  conn.addEventListener('change', () => {
    const isSlow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
    document.documentElement.classList.toggle('slow-connection', isSlow);
  });
})();

// ===================== START =====================
// Firebase auth state is observed via firebase.auth().onAuthStateChanged() above.
// _onFirebaseLogin / _onFirebaseLogout callbacks are registered inside init().
// We call init() here; it sets up those callbacks. Firebase then fires
// onAuthStateChanged which drives the UI from that point on.
init();



// ╔══════════════════════════════════════════════════════════════════╗
// ║         OFFLINE QUEUE — Phase 2                                 ║
// ║  Saves actions when offline, syncs when connection returns      ║
// ╚══════════════════════════════════════════════════════════════════╝

const OFFLINE_QUEUE_KEY = 'learnos_offline_queue';

// Add an action to the offline queue
function offlineQueueAdd(action) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({ ...action, queuedAt: new Date().toISOString(), id: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('[OfflineQueue] Added:', action.type);
  } catch(e) { console.warn('[OfflineQueue] Failed to add:', e); }
}

// Process all queued actions when back online
async function offlineQueueProcess() {
  if (!navigator.onLine) return;
  if (!window._db || !window._fbUid) return;

  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch { return; }

  if (queue.length === 0) return;
  console.log('[OfflineQueue] Processing', queue.length, 'queued actions…');

  const successful = [];

  for (const action of queue) {
    try {
      switch(action.type) {
        case 'SAVE_DATA':
          await fbSave(action.key, action.data);
          successful.push(action.id);
          break;
        case 'SAVE_SHARED':
          await fbSaveShared(action.key, action.data);
          successful.push(action.id);
          break;
        case 'SAVE_META':
          await fbSaveUserMeta(action.data);
          successful.push(action.id);
          break;
      }
    } catch(e) {
      console.warn('[OfflineQueue] Action failed:', action.type, e);
    }
  }

  // Remove successful actions from queue
  const remaining = queue.filter(a => !successful.includes(a.id));
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));

  if (successful.length > 0) {
    console.log('[OfflineQueue] Synced', successful.length, 'actions ✅');
    showToast(`☁️ Synced ${successful.length} offline action${successful.length > 1 ? 's' : ''}`, 'success');
  }
}

// Listen for SW message to process queue
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'PROCESS_OFFLINE_QUEUE') {
      offlineQueueProcess();
    }
  });
}

// Auto-process when coming back online
window.addEventListener('online', () => {
  setTimeout(offlineQueueProcess, 1500); // small delay to let Firebase reconnect
});

// ── Service Worker Registration ──────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ LearnOS SW Phase 2 registered:', reg.scope);

      // Listen for SW updates — auto-update immediately
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // Tell new SW to activate immediately (skip waiting)
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            if (navigator.serviceWorker.controller) {
              // Reload page to use new SW immediately
              showToast('🔄 App updated — reloading...', 'success');
              setTimeout(() => window.location.reload(), 1500);
            }
          }
        });
      });

      // Check for SW updates every time page becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update();
      });

      // Register Background Sync for offline queue
      if ('SyncManager' in window) {
        try {
          await reg.sync.register('learnos-offline-queue');
          console.log('✅ Background Sync registered');
        } catch(e) { console.warn('Background Sync not supported:', e); }
      }

      // Register Periodic Sync to keep cache fresh (every 24h)
      if ('periodicSync' in reg) {
        try {
          const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
          if (status.state === 'granted') {
            await reg.periodicSync.register('learnos-cache-refresh', {
              minInterval: 24 * 60 * 60 * 1000 // 24 hours
            });
            console.log('✅ Periodic Sync registered');
          }
        } catch(e) { console.warn('Periodic Sync not supported:', e); }
      }

    } catch(err) {
      console.warn('SW registration failed:', err);
    }

    // Listen for SW messages
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'PROCESS_OFFLINE_QUEUE') offlineQueueProcess();
    });

    // When SW controller changes (new version activated), reload for fresh code
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Process any pending offline queue on load
    window.addEventListener('online', () => setTimeout(offlineQueueProcess, 1500));
    if (navigator.onLine) setTimeout(offlineQueueProcess, 3000);
  });
}

// ── PWA Install Prompt ────────────────────────────────────────
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  // Show install banner after 3 seconds if not already installed
  setTimeout(showInstallBanner, 3000);
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  hideInstallBanner();
  showToast('🎉 LearnOS installed! Find it on your home screen.', 'success');
});

function showInstallBanner() {
  if (!_deferredInstallPrompt) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  let banner = document.getElementById('pwa-install-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex:1;">
        <img src="/icon-192.png" style="width:40px;height:40px;border-radius:10px;" onerror="this.style.display='none'">
        <div>
          <div style="font-weight:700;font-size:0.88rem;display:flex;align-items:center;gap:6px;">
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <circle cx="9" cy="9" r="7.5" fill="none" stroke="#fff" stroke-width="2"
              stroke-dasharray="35 12" stroke-linecap="round" transform="rotate(-90 9 9)"/>
            <rect x="5" y="11" width="2" height="4" rx="0.5" fill="rgba(255,255,255,0.5)"/>
            <rect x="8" y="8"  width="2" height="7" rx="0.5" fill="rgba(255,255,255,0.75)"/>
            <rect x="11" y="5" width="2" height="10" rx="0.5" fill="#fff"/>
          </svg>
          Install LearnOS
        </div>
          <div style="font-size:0.72rem;color:rgba(255,255,255,0.75);">Add to home screen for best experience</div>
        </div>
      </div>
      <button onclick="installPWA()" style="background:#fff;color:#7c3aed;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:0.82rem;cursor:pointer;white-space:nowrap;">Install</button>
      <button onclick="hideInstallBanner()" style="background:transparent;border:none;color:rgba(255,255,255,0.6);font-size:1.2rem;cursor:pointer;padding:4px 8px;line-height:1;">×</button>
    `;
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;
      background:linear-gradient(135deg,#7c3aed,#5b21b6);
      color:#fff;padding:14px 16px;
      display:flex;align-items:center;gap:10px;
      z-index:99999;box-shadow:0 -4px 20px rgba(124,58,237,0.4);
      animation:slideUp 0.3s ease;
    `;
    // Add animation
    if (!document.getElementById('pwa-anim-style')) {
      const style = document.createElement('style');
      style.id = 'pwa-anim-style';
      style.textContent = '@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
      document.head.appendChild(style);
    }
    document.body.appendChild(banner);
  }
  banner.style.display = 'flex';
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.style.display = 'none';
  // Don't show again this session
  _deferredInstallPrompt = null;
}

async function installPWA() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  console.log('Install outcome:', outcome);
  _deferredInstallPrompt = null;
  hideInstallBanner();
}

// ── Online/Offline Status Banner ──────────────────────────────
function showOfflineBanner() {
  let el = document.getElementById('offline-status-bar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'offline-status-bar';
    el.style.cssText = `position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;
      text-align:center;padding:6px;font-size:0.78rem;font-weight:600;z-index:99998;`;
    el.textContent = '📡 No internet connection — working offline';
    document.body.prepend(el);
  }
  el.style.display = 'block';
}

function hideOfflineBanner() {
  const el = document.getElementById('offline-status-bar');
  if (el) el.style.display = 'none';
}

function updateOfflineDot() {
  const dot = document.getElementById('topbar-offline-dot');
  if (dot) dot.style.display = navigator.onLine ? 'none' : 'block';
}
window.addEventListener('online',  () => {
  hideOfflineBanner();
  updateOfflineDot();
  showToast('✅ Back online — syncing data…', 'success');
  setTimeout(offlineQueueProcess, 1500);
});
window.addEventListener('offline', () => {
  showOfflineBanner();
  updateOfflineDot();
  showToast('📡 Offline — changes will sync when connected', '');
});
if (!navigator.onLine) { showOfflineBanner(); updateOfflineDot(); }

// ╔══════════════════════════════════════════════════════════════════╗
// ║         PHASE 3 — MOBILE UX ENHANCEMENTS                       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── Swipe to open/close sidebar ──────────────────────────────────
(function initSwipeGesture() {
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 60;
  const EDGE_ZONE = 30; // px from left edge to trigger open

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll, ignore
    if (Math.abs(dx) < SWIPE_THRESHOLD) return; // too short

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (dx > 0 && touchStartX < EDGE_ZONE) {
      // Swipe right from left edge → open sidebar
      sidebar.classList.add('open');
      const ov = document.getElementById('sidebar-overlay');
      if (ov) ov.classList.add('visible');
      const main = document.getElementById('main');
      if (main) main.style.overflow = 'hidden';
    } else if (dx < 0 && sidebar.classList.contains('open')) {
      // Swipe left → close sidebar
      closeSidebarMobile();
    }
  }, { passive: true });
})();

// ── Ripple effect on bottom nav buttons ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.bnav-item').forEach(btn => {
    btn.addEventListener('touchstart', function(e) {
      const touch  = e.touches[0];
      const rect   = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple-fx';
      ripple.style.left = (touch.clientX - rect.left) + 'px';
      ripple.style.top  = (touch.clientY - rect.top)  + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  });
});

// ── Pull-to-refresh prevention removed — it was blocking page scroll ──
// CSS overscroll-behavior handles this safely without blocking scroll

// ── Double-tap topbar logo to scroll to top ──────────────────────
(function() {
  let lastTap = 0;
  const logo = document.querySelector('.topbar-logo');
  if (!logo) return;
  logo.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    lastTap = now;
  });
})();