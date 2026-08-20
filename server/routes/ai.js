import { Router } from 'express';
import path from 'path';
import { queryAll, queryOne, run, saveDB } from '../db.js';
import { storage } from '../storage/index.js';

const router = Router();

// Aliyun DashScope (百炼) — OpenAI-compatible endpoint
const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = process.env.DASHSCOPE_MODEL || 'qwen-vl-max';
const MAX_IMAGES = 10; // cap frames sent to the model to control cost / limits

// Derive thumbnail filename (mirrors photos.js)
function thumbName(filename) {
  const ext = path.extname(filename);
  return `thumb_${filename.replace(ext, '.jpg')}`;
}

// Evenly sample up to `max` items across the array (keeps first & last)
function sampleEvenly(arr, max) {
  if (arr.length <= max) return arr;
  const step = (arr.length - 1) / (max - 1);
  const picked = [];
  for (let i = 0; i < max; i++) picked.push(arr[Math.round(i * step)]);
  return picked;
}

// Read a photo's thumbnail (fallback to original) and return a base64 data URL
async function toDataUrl(photo) {
  let buffer;
  try {
    buffer = await storage.get(thumbName(photo.filename));
  } catch {
    buffer = await storage.get(photo.filename);
  }
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

const SYSTEM_PROMPT = `你是一位擅长胶片摄影和小红书内容的文案编辑。用户会给你一整卷胶片里的若干张照片,以及这卷的拍摄信息。请你通读整卷的画面内容、色调和氛围,产出一条用于小红书发布的图文文案。

风格要求(非常重要):
- 日系、文艺、克制,高级而简单,像给朋友写的私人日记片段,不是广告。
- 营销感要弱:不要"绝绝子/家人们/冲鸭/宝子/码住"这类网感词,不要夸张感叹号堆砌,不要"教程感"。
- 标题短(建议 5-14 字),要有青春、情绪和故事感,像电影名、歌名或日记标题,不要平铺直叙、不要"XX的一天""记录美好"这类模板。风格可以在以下几类里灵活选,贴合这卷画面的情绪来定:
  · 意象留白式(用空格断开):如"夏天 周而复始""抓住一朵云"
  · 邀约/口语式:如"跟我回去十八岁""一起逃离雨季""我们不要在这里"
  · 情绪感叹式(可带"啊/吧"等语气词):如"是热烈又明亮的青春啊"
  · 电影/歌名式(可用英文,但别硬凑):如"call me by your name""关于莉莉周的一切""pick pick star""隔在我们之间的种种"
  优先选最贴合画面情绪的一种,宁可留白含蓄,也不要直白解说。
  重要(必须遵守):上面列出的都是"用户为别的照片起过的旧标题",只用来让你体会语感和风格。你输出的标题绝对不能等于、也不能高度近似其中任何一条(例如不允许直接输出"我们不要在这里""跟我回去十八岁"等);必须针对这一卷的真实画面,现场原创一个从未出现过的新标题。
- 正文 2-4 行短句,像散文/诗的碎片,描述这卷照片的时间、光线、场景或心境,不要逐张罗列,不要解释相机参数。
- 结合用户提供的地点/时间/相机/胶卷信息,但只在自然时才提及,不要硬塞。

Tag 要求:
- 从这个常用池子里挑选契合的:#日系 #氛围感 #来拍照了 #绘画参考 #摄影 #拍照姿势 #审美积累 #胶片 #电影感 #生活碎片。
- 也可以根据画面内容补充 1-2 个更贴切的 tag(如 #夏天 #海边 #城市漫步 等)。
- 总共 4-7 个,每个以 # 开头。

封面:从我给你的照片里,选出最适合当封面的那一张(画面最有代表性/最出片的),返回它的 photo_id。

只返回一个 JSON 对象,不要任何多余文字或代码块标记,格式严格如下:
{"cover_photo_id": <数字>, "title": "<标题>", "body": "<正文,用\\n换行>", "tags": ["#xxx", "#yyy"]}`;

function buildRollInfo(roll) {
  const parts = [];
  if (roll.title) parts.push(`标题/主题:${roll.title}`);
  if (roll.shoot_date) parts.push(`拍摄时间:${roll.shoot_date}`);
  if (roll.location) parts.push(`拍摄地点:${roll.location}`);
  if (roll.camera) parts.push(`相机:${roll.camera}`);
  if (roll.film_stock) parts.push(`胶卷:${roll.film_stock}`);
  if (roll.notes) parts.push(`备注:${roll.notes}`);
  return parts.length ? parts.join('\n') : '(无额外信息)';
}

// Strip markdown code fences and parse the first JSON object found
function parseModelJSON(text) {
  let t = (text || '').trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

// GET saved caption for a roll (null if none yet)
router.get('/caption/:rollId', async (req, res) => {
  const cap = await queryOne(
    'SELECT * FROM captions WHERE roll_id = ? ORDER BY id DESC LIMIT 1',
    [Number(req.params.rollId)]
  );
  if (!cap) return res.json(null);
  res.json({ ...cap, tags: safeParseTags(cap.tags) });
});

function safeParseTags(tags) {
  if (!tags) return [];
  try { return JSON.parse(tags); } catch { return []; }
}

// POST generate (or regenerate) a caption for a roll
router.post('/caption/:rollId', async (req, res) => {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI 文案功能尚未配置',
      detail: '缺少环境变量 DASHSCOPE_API_KEY。请在阿里云百炼开通并配置 API Key。',
    });
  }

  const roll = await queryOne('SELECT * FROM rolls WHERE id = ?', [Number(req.params.rollId)]);
  if (!roll) return res.status(404).json({ error: 'Roll not found' });

  const photos = await queryAll(
    'SELECT id, filename, sort_order FROM photos WHERE roll_id = ? ORDER BY sort_order',
    [Number(req.params.rollId)]
  );
  if (!photos.length) return res.status(400).json({ error: '这一卷还没有照片' });

  const sampled = sampleEvenly(photos, MAX_IMAGES);

  // Build multimodal message content: label each frame with its photo_id, then the image
  const content = [
    { type: 'text', text: `这一卷共有 ${photos.length} 张照片,以下抽取了 ${sampled.length} 张代表性画面。\n\n拍摄信息:\n${buildRollInfo(roll)}\n\n请根据这些画面和信息生成文案。可选封面的 photo_id 有:${sampled.map(p => p.id).join(', ')}。` },
  ];
  for (const p of sampled) {
    content.push({ type: 'text', text: `photo_id=${p.id}` });
    content.push({ type: 'image_url', image_url: { url: await toDataUrl(p) } });
  }

  let modelText;
  try {
    const resp = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('DashScope error:', resp.status, errBody);
      return res.status(502).json({ error: 'AI 服务调用失败', detail: `${resp.status}: ${errBody.slice(0, 300)}` });
    }
    const data = await resp.json();
    modelText = data?.choices?.[0]?.message?.content;
    if (Array.isArray(modelText)) {
      modelText = modelText.map(c => (typeof c === 'string' ? c : c.text || '')).join('');
    }
  } catch (e) {
    console.error('DashScope request failed:', e);
    return res.status(502).json({ error: 'AI 服务连接失败', detail: e.message });
  }

  let parsed;
  try {
    parsed = parseModelJSON(modelText);
  } catch (e) {
    console.error('Failed to parse model output:', modelText);
    return res.status(502).json({ error: 'AI 返回内容解析失败,请重试', detail: (modelText || '').slice(0, 300) });
  }

  const validIds = new Set(photos.map(p => p.id));
  let coverId = Number(parsed.cover_photo_id);
  if (!validIds.has(coverId)) coverId = sampled[0].id;

  const title = String(parsed.title || '').trim();
  const body = String(parsed.body || '').trim();
  let tags = Array.isArray(parsed.tags) ? parsed.tags : [];
  tags = tags.map(t => String(t).trim()).filter(Boolean).map(t => (t.startsWith('#') ? t : `#${t}`));

  // Replace any existing caption for this roll
  await run('DELETE FROM captions WHERE roll_id = ?', [Number(req.params.rollId)]);
  const id = await run(
    'INSERT INTO captions (roll_id, cover_photo_id, title, body, tags) VALUES (?, ?, ?, ?, ?)',
    [Number(req.params.rollId), coverId, title, body, JSON.stringify(tags)]
  );
  saveDB();

  res.json({ id, roll_id: Number(req.params.rollId), cover_photo_id: coverId, title, body, tags });
});

// PUT update the cover photo (manual override) or edited text
router.put('/caption/:rollId', async (req, res) => {
  const existing = await queryOne(
    'SELECT * FROM captions WHERE roll_id = ? ORDER BY id DESC LIMIT 1',
    [Number(req.params.rollId)]
  );
  if (!existing) return res.status(404).json({ error: '还没有生成文案' });

  const cover = req.body.cover_photo_id != null ? Number(req.body.cover_photo_id) : existing.cover_photo_id;
  const title = req.body.title != null ? String(req.body.title) : existing.title;
  const body = req.body.body != null ? String(req.body.body) : existing.body;
  const tags = req.body.tags != null ? JSON.stringify(req.body.tags) : existing.tags;

  await run(
    `UPDATE captions SET cover_photo_id=?, title=?, body=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [cover, title, body, tags, existing.id]
  );
  saveDB();

  res.json({ id: existing.id, roll_id: Number(req.params.rollId), cover_photo_id: cover, title, body, tags: safeParseTags(tags) });
});

export default router;
