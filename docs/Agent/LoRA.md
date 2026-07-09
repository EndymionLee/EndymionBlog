---
title: LoRA
date: 2026-06-04
---
# 认识模型微调

## 什么是微调？

**微调（Fine-tuning）** 是在预训练模型的基础上，用特定数据继续训练，让模型适应你的任务。

```
预训练模型：看过大量通用文本，什么都知道一点

     ↓ 微调（用你的数据继续训练）
   
微调后模型：更擅长的特定任务
```

## RAG 和 微调

| 维度               | RAG              | 微调               |
| ------------------ | ---------------- | ------------------ |
| **改什么**   | 改输入（加资料） | 改模型（调参数）   |
| **知识更新** | 实时，换文档就行 | 慢，要重新训练     |
| **幻觉控制** | 好（有资料约束） | 一般（靠记忆）     |
| **成本**     | 按 Token 付费    | 一次性训练成本     |
| **适用场景** | 知识问答、客服   | 格式遵循、风格迁移 |
| **需要数据** | 知识库文档       | 问答对/指令数据    |

### 什么时候应该用哪个？

```
一个知识库，用户问的是"公司政策是什么？"
→ RAG （知识经常变，需要查具体文档）

需要模型输出特定格式（JSON、Markdown、特定风格）
→ 微调 （不需要外部知识，需要行为对齐）

既要知识又要格式？
→ RAG + 微调 （最佳组合，RAG 负责知识，微调负责行为）
```

## 微调的三种层次

### 1. 全参微调（Full Fine-tuning）

```
更新所有参数
需要 8× 80GB GPU（甚至更多）
效果好，但贵得离谱
普通人基本不用
```

### 2. 高效微调（PEFT）

```
只更新一小部分参数（~1%）
LoRA / QLoRA / Adapter
一张 24GB GPU 就能跑
效果接近全参微调
```

### 3. 领域微调

```
在特定领域数据上继续预训练
比如：法律、医疗、代码
需要大量领域数据
适合做垂直领域模型
```

## 主流高效微调方法

| 方法                    | 原理             | 显存需求 | 效果     |
| ----------------------- | ---------------- | -------- | -------- |
| **LoRA**          | 低秩矩阵注入     | 24GB     | ⭐⭐⭐⭐ |
| **QLoRA**         | LoRA + 4bit 量化 | 8-12GB   | ⭐⭐⭐   |
| **Prompt Tuning** | 只调 Prompt 模板 | 8GB      | ⭐⭐     |
| **Prefix Tuning** | 加前缀向量       | 8GB      | ⭐⭐     |

> 先用 QLoRA（门槛最低），再试 LoRA（效果更好）

## 微调的典型流程

```
① 准备数据
   └─ 收集/生成 问答对 → 格式化 → 检查质量

② 选择基座模型
   └─ Qwen / LLaMA / DeepSeek / ChatGLM

③ 配置训练参数
   └─ LoRA rank / learning rate / batch size

④ 开始训练
   └─ 观察 loss → 选择最佳 checkpoint

⑤ 评估效果
   └─ 在测试集上对比微调前后的表现

⑥ 部署
   └─ 合并 LoRA 权重 → 量化 → 部署推理
```

# LoRA 与 QLoRA

## LoRA 原理

> 冻结原始权重，在旁边加一条"小回路"训练，训练完合并回去。

```
原始模型权重（冻结，不更新）     LoRA 旁路（可训练，占 1%）
┌─────────────────┐          ┌──────────────┐
│  W (1000×1000)  │    +     │  A×B (低秩)   │
│   冻结，不动     │          │   只训这个    │
└─────────────────┘          └──────────────┘
```

## 环境准备

```bash
pip install torch transformers datasets accelerate
pip install peft           # LoRA 核心库
pip install bitsandbytes   # 4bit 量化（QLoRA 需要）
pip install trl            # SFTTrainer（训练器）
```

## 完整微调代码

### 用 QLoRA 微调 Qwen2.5-7B

```python
# finetune_qwen.py
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer


# ===== 1. 量化配置（QLoRA 核心） =====
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,                     # 4bit 量化
    bnb_4bit_quant_type="nf4",              # 量化方式
    bnb_4bit_compute_dtype=torch.float16,   # 计算精度
    bnb_4bit_use_double_quant=True,         # 双重量化（省更多显存）
)

# ===== 2. 加载模型和分词器 =====
model_name = "Qwen/Qwen2.5-7B-Instruct"

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,  # 4bit 加载
    device_map="auto",               # 自动分配 GPU
    trust_remote_code=True,
)

tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

# ===== 3. LoRA 配置 =====
lora_config = LoraConfig(
    r=16,                       # LoRA 秩（越大越强，越费显存）
    lora_alpha=32,              # 缩放系数
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # 作用的目标模块
    lora_dropout=0.05,          # Dropout 防过拟合
    bias="none",
    task_type="CAUSAL_LM",      # 因果语言模型
)

model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# 输出: trainable params: ~8M / 7B total = 0.1% ← 只训练 0.1% 的参数！

# ===== 4. 准备训练数据 =====
# 数据格式：每条是 {"instruction": "...", "output": "..."}
dataset = load_dataset("json", data_files="train_data.json")

def format_chat(example):
    """将数据格式化为对话"""
    return {
        "text": f"<|im_start|>user\n{example['instruction']}\n<|im_end|>\n"
                f"<|im_start|>assistant\n{example['output']}\n<|im_end|>"
    }

dataset = dataset.map(format_chat)

# ===== 5. 训练参数 =====
training_args = TrainingArguments(
    output_dir="./qwen-lora",       # 输出目录
    per_device_train_batch_size=4,  # 批次大小（根据显存调）
    gradient_accumulation_steps=4,  # 梯度累积（等效 batch_size = 16）
    learning_rate=2e-4,             # 学习率（LoRA 通常比全参大）
    num_train_epochs=3,             # 训练轮数
    logging_steps=10,               # 每隔几步打日志
    save_steps=100,                 # 每隔几步保存
    save_total_limit=2,             # 最多保留 2 个检查点
    fp16=True,                      # 半精度训练
    optim="paged_adamw_8bit",       # 8bit 优化器（省显存）
    lr_scheduler_type="cosine",     # 学习率调度
    warmup_ratio=0.03,              # 预热比例
    report_to="none",               # 不报告到外部
)

# ===== 6. 训练 =====
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    args=training_args,
    train_dataset=dataset["train"],
    max_seq_length=1024,            # 最大序列长度
    dataset_text_field="text",
)

trainer.train()

# ===== 7. 保存 LoRA 权重 =====
model.save_pretrained("./qwen-lora-final")
tokenizer.save_pretrained("./qwen-lora-final")
print("微调完成！权重已保存")
```

## 推理时加载 LoRA 权重

```python
# inference.py
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# 1. 加载基座模型
base_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-7B-Instruct",
    torch_dtype=torch.float16,
    device_map="auto",
)

# 2. 加载 LoRA 权重
model = PeftModel.from_pretrained(base_model, "./qwen-lora-final")

# 3. 合并权重（可选，合并后推理更快）
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./qwen-lora-merged")

# 4. 推理
tokenizer = AutoTokenizer.from_pretrained("./qwen-lora-final")

prompt = "<|im_start|>user\n什么是 RAG？\n<|im_end|>\n<|im_start|>assistant\n"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = merged_model.generate(**inputs, max_new_tokens=256)
print(tokenizer.decode(outputs[0]))
```

## LoRA 参数调优

| 参数                    | 推荐值      | 大了会怎样   | 小了会怎样 |
| ----------------------- | ----------- | ------------ | ---------- |
| **r**（秩）       | 8-32        | 更准但费显存 | 欠拟合     |
| **lora_alpha**    | 16-64       | 权重影响大   | 影响小     |
| **learning_rate** | 1e-4 ~ 5e-4 | 不稳定       | 收敛慢     |
| **num_epochs**    | 2-5         | 过拟合       | 欠拟合     |
| **batch_size**    | 尽量大      | 稳定         | 震荡       |

## 显存占用参考

| 方法         | 模型大小 | 显存需求 | 典型 GPU      |
| ------------ | -------- | -------- | ------------- |
| QLoRA (4bit) | 7B       | 8-12GB   | RTX 3060/4060 |
| QLoRA (4bit) | 14B      | 16-20GB  | RTX 3090      |
| LoRA (8bit)  | 7B       | 16-20GB  | RTX 3090      |
| LoRA (16bit) | 7B       | 28-32GB  | RTX 4090      |
| 全参微调     | 7B       | 56+GB    | A100 80G      |

> **LoRA ≈ 花 1% 的成本，拿到 90% 全参微调的效果。QLoRA 连显卡门槛都给降到消费级了。**

# 微调数据集构建

## 数据格式

### 对话格式（最常用）

```json
[
    {
        "instruction": "什么是 RAG？",
        "output": "RAG（检索增强生成）是一种...",
        "system": "你是一个 AI 知识库助手"  // 可选
    },
    {
        "instruction": "RAG 和微调有什么区别？",
        "output": "RAG 是外挂知识，微调是内化能力..."
    }
]
```

### ShareGPT 格式

```json
{
    "conversations": [
        {"from": "system", "value": "你是一个助手"},
        {"from": "human", "value": "什么是 RAG？"},
        {"from": "gpt", "value": "RAG 是..."}
    ]
}
```

## 从知识库生成数据

有了知识库，可以直接从中生成训练数据：

```python
from openai import OpenAI

client = OpenAI()


def generate_training_data(
    documents: list[str],
    pairs_per_doc: int = 5,
    model: str = "gpt-4o",
) -> list[dict]:
    """
    从文档生成训练数据
  
    用强模型（GPT-4o）从文档中提取知识点
    生成问答对，用来微调小模型
    """
    dataset = []
  
    for doc in documents:
        prompt = f"""
        根据以下文档，生成 {pairs_per_doc} 个高质量的问答对。
        要求：
        - 问题和答案都基于文档内容
        - 问题多样化（是什么、为什么、怎么做、对比）
        - 答案清晰完整
      
        文档：
        {doc[:2000]}
      
        回复 JSON 格式（列表）：
        [{{"instruction": "问题", "output": "答案"}}]
        """
      
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
      
        pairs = json.loads(response.content)
        dataset.extend(pairs)
  
    return dataset


# 使用
documents = ["RAG 是检索增强生成...", "向量数据库用于..."]
dataset = generate_training_data(documents)
```

## 数据质量控制

```python
class DatasetValidator:
    """训练数据集质量检查"""
  
    def __init__(self, dataset: list[dict]):
        self.dataset = dataset
  
    def check_basic(self) -> list[str]:
        """基础检查"""
        issues = []
      
        for i, item in enumerate(self.dataset):
            # 空内容
            if not item.get("instruction", "").strip():
                issues.append(f"#{i}: instruction 为空")
            if not item.get("output", "").strip():
                issues.append(f"#{i}: output 为空")
          
            # 过短
            if len(item.get("output", "")) < 10:
                issues.append(f"#{i}: output 太短 ({len(item['output'])}字符)")
          
            # 包含占位符
            if "{{" in item.get("output", ""):
                issues.append(f"#{i}: 包含未替换的占位符")
      
        return issues
  
    def check_duplicates(self) -> list[str]:
        """查重"""
        from collections import Counter
        questions = [d["instruction"] for d in self.dataset]
        return [q for q, c in Counter(questions).items() if c > 1]
  
    def check_length_distribution(self) -> dict:
        """长度分布"""
        lengths = [len(d["output"]) for d in self.dataset]
        return {
            "total": len(lengths),
            "min": min(lengths),
            "max": max(lengths),
            "avg": sum(lengths) / len(lengths),
            "short (<20)": sum(1 for l in lengths if l < 20),
            "long (>500)": sum(1 for l in lengths if l > 500),
        }
  
    def report(self) -> dict:
        """完整报告"""
        return {
            "total": len(self.dataset),
            "issues": self.check_basic(),
            "duplicates": self.check_duplicates(),
            "lengths": self.check_length_distribution(),
            "pass": len(self.check_basic()) == 0 and len(self.check_duplicates()) == 0,
        }
```

## 数据量参考

| 任务类型           | 最少数据 | 推荐数据 | 说明                   |
| ------------------ | -------- | -------- | ---------------------- |
| **格式遵循** | 100 条   | 500+     | 让模型学会输出特定格式 |
| **指令遵循** | 500 条   | 2000+    | 让模型听话             |
| **领域知识** | 1000 条  | 5000+    | 让模型学会新知识       |
| **对话能力** | 2000 条  | 10000+   | 让模型学会聊天         |

> **质量远比数量重要。100 条精心标注的数据 > 1000 条自动生成的垃圾数据。**

## 数据增强技巧

```python
def augment_dataset(dataset: list[dict]) -> list[dict]:
    """数据增强"""
    augmented = []
  
    for item in dataset:
        # 原样保留
        augmented.append(item)
      
        # 1. 改写问题（同义替换）
        augmented.append({
            "instruction": rewrite_question(item["instruction"]),
            "output": item["output"],
        })
      
        # 2. 反过来问
        if "是什么" in item["instruction"]:
            augmented.append({
                "instruction": item["instruction"].replace("是什么", "有哪些"),
                "output": item["output"],
            })
  
    return augmented
```

> **训练数据 = 模型的"参考答案"。答案质量直接决定微调效果。宁缺毋滥。**

# 微调评估与部署

## 微调后怎么评估？

用更加强大的llm生成问答，来评测微调效果：

```python
def compare_before_after(
    base_model_fn,    # 微调前的模型
    ft_model_fn,      # 微调后的模型
    test_questions: list[str],
) -> dict:
    """对比微调前后效果"""
    results = {"before": [], "after": []}
  
    for q in test_questions:
        base_ans = base_model_fn(q)
        ft_ans = ft_model_fn(q)
      
        results["before"].append({
            "question": q,
            "answer": base_ans,
            "length": len(base_ans),
        })
        results["after"].append({
            "question": q,
            "answer": ft_ans,
            "length": len(ft_ans),
        })
  
    return results
```

## 合并 LoRA 权重

训练后有两种使用方式：

```python
# 方式一：不合并（灵活）
model = PeftModel.from_pretrained(base_model, lora_path)
# 可以随时卸载 LoRA 回到基座模型

# 方式二：合并（效率高）
merged = model.merge_and_unload()
merged.save_pretrained("./merged_model")
# 推理速度和不带 LoRA 一样快
```

## 部署到 Ollama（配合本地部署）

```bash
# 1. 将合并后的模型转为 GGUF
# 使用 llama.cpp 的 convert.py

# 2. 创建 Modelfile
echo "FROM ./qwen-lora-merged.gguf" > Modelfile
echo 'TEMPLATE """<|im_start|>user\n{{.Prompt}}\n<|im_end|>\n<|im_start|>assistant\n"""' >> Modelfile

# 3. 导入 Ollama
ollama create my-finetuned-model -f Modelfile

# 4. 运行
ollama run my-finetuned-model
```

## 常见问题

| 问题                         | 原因                  | 解决                      |
| ---------------------------- | --------------------- | ------------------------- |
| Loss 不降                    | 学习率太小            | 增大 lr 到 2e-4           |
| Loss 震荡                    | 学习率太大/batch 太小 | 减小 lr 或增大 batch      |
| 过拟合（训练集好测试集差）   | 数据太少/epoch 太多   | 减少 epoch 或增大 dropout |
| 灾难性遗忘（忘了原来的能力） | 学习率太大/训练太久   | 用更低 lr 或混合通用数据  |
| 输出乱码                     | 分词器/模板不对       | 检查 chat template        |
