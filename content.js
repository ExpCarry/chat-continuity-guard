/* Copyright (c) 2026 ExpCarry — MIT License.
 * Chat Continuity Guard — local-only, DOM-based early warning.
 * No network requests, telemetry, or interception of ChatGPT internal APIs.
 * A browser extension cannot read the model's actual remaining context budget.
 */
(() => {
  'use strict';
  if (window.__chatContinuityGuardLoaded) return;
  window.__chatContinuityGuardLoaded = true;
  // English-only interface.
  const strings = {
    en: {
      open: 'Open a ChatGPT conversation', critical: 'Long chat — save your context',
      warn: 'Time to save context', messages: 'messages', tokens: 'tokens',
      title: 'Chat Continuity Guard', subtitle: 'Local long-chat monitor', close: 'Close',
      visibleMessages: 'visible messages', visibleTokens: 'estimated visible tokens',
      notification: 'Consider preparing a handoff summary before reaching a possible limit.',
      hint: 'This is NOT your model’s actual context usage. Warnings use thresholds you choose.',
      copy: 'Copy context handoff prompt', exported: 'Download visible chat (.md)',
      messageThreshold: 'Warn after messages', tokenThreshold: 'Or estimated tokens',
      small: 'Privacy: no chat data is sent over the network. On-screen text may be incomplete (e.g., due to lazy loading). Cannot read server quotas. Export only occurs when clicked.',
      copied: 'Prompt copied', copyFailed: 'Copy failed — check browser permissions',
      pillTitle: 'Estimated visible-chat length, not the model context budget'
    }
  };
  const t = strings.en;

  const handoffPrompt = {
    en: `CHAT CONTEXT HANDOFF. Create a complete, self-contained handoff packet so a new ChatGPT conversation can continue this work with minimal repetition. Include: (1) the current goal and acceptance criteria; (2) confirmed facts, decisions, and preferences; (3) completed work, concrete outputs, and verified tests; (4) exact current files, URLs, paths, branches, commands, and important values; (5) pending tasks and the next specific action; (6) errors, blockers, risks, and what NOT to repeat; (7) a ready-to-copy prompt for the new chat. Clearly distinguish confirmed facts from assumptions, and do not invent information. Prioritize details essential to resuming the work. Respond as one complete Markdown block.`
  };
  const storageKey = 'ccgSettings';
  const defaults = { messages: 70, tokens: 50000 };
  let settings = {...defaults};
  let expanded = false;
  let last = { messages:0, characters:0, tokens:0, turns:[] };
  let debounceId = null;
  let dismissedForPath = '';
  const root = document.createElement('div');
  root.id = 'ccg-extension-root';
  const shadow = root.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial} *{box-sizing:border-box}
    .ccg{position:fixed;bottom:92px;right:20px;z-index:2147483646;font:13px/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#e9e9ef;direction:ltr;max-width:min(360px,calc(100vw - 32px))}
    button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #af94ff;outline-offset:2px}
    .pill{border:1px solid #4b4655;display:flex;align-items:center;gap:8px;justify-content:center;color:#fff;background:#242128;border-radius:30px;padding:8px 13px;box-shadow:0 8px 25px #0007;min-height:36px}
    .pill:hover{background:#323039}.pill.warn{border-color:#f0ba61}.pill.critical{border-color:#ff5b74;background:#41232d}.dot{width:8px;height:8px;background:#7dd7af;border-radius:50%;display:inline-block}.warn .dot{background:#f0ba61}.critical .dot{background:#ff647a}
    .panel{margin-top:7px;width:340px;max-width:100%;background:#211e27;color:#eae8ee;border:1px solid #4d4659;box-shadow:0 16px 55px #0009;border-radius:14px;padding:15px}
    .head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px;font-weight:700}.close{background:none;border:0;color:#b4afbd;font-size:22px;line-height:1;padding:0 4px}
    .muted{color:#b9b3c2;font-size:12px}.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
    .stat{padding:10px;border:1px solid #4e4856;border-radius:10px}.stat strong{display:block;font-size:18px;color:#fff}.hint{font-size:12px;margin:9px 0;padding:10px;border-radius:9px;background:#33303a}
    .buttons{display:grid;grid-template-columns:1fr;gap:7px;margin-top:9px}.btn{border:1px solid #645d71;background:#3b3545;color:white;border-radius:9px;padding:9px 10px;text-align:left}.btn:hover{background:#4b425b}.primary{background:#7552bc;border-color:#7552bc}.primary:hover{background:#8664cd}
    .limits{margin-top:12px;border-top:1px solid #45404c;padding-top:9px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.limits label{font-size:11px;color:#c8c1ce}.limits input{display:block;width:100%;margin-top:4px;border-radius:7px;border:1px solid #59515f;background:#2d2933;color:#fff;padding:6px 7px}
    .small{margin-top:11px;font-size:11px;color:#aca5b5}.notification{background:#673843;border:1px solid #f18aa0;padding:10px;border-radius:9px;margin-top:10px}
    @media(max-width:600px){.ccg{right:9px;bottom:83px;max-width:calc(100vw - 18px)}.panel{width:300px}}
  `;
  shadow.append(style);
  const container = document.createElement('div');
  container.className = 'ccg';
  shadow.append(container);
  document.documentElement.append(root);

  const escapeHtml = x => String(x).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const conversation = () => /(^|\/)c\/[a-z0-9-]+/i.test(location.pathname);
  const estimateTokens = text => {
    const cyrillic = (text.match(/[\u0400-\u052F]/g) || []).length;
    const other = text.length - cyrillic;
    // Rough heuristic for Latin, Cyrillic and code. Not a model tokenizer.
    return Math.ceil(other / 3.6 + cyrillic / 1.8);
  };
  const getTurns = () => {
    if (!conversation()) return [];
    const nodes = Array.from(document.querySelectorAll('[data-testid^="conversation-turn"], [data-message-author-role]'));
    const unique = new Map();
    for (const el of nodes) {
      const outer = el.closest('[data-testid^="conversation-turn"]') || el;
      if (unique.has(outer)) continue;
      const roleNode = outer.matches('[data-message-author-role]') ? outer : outer.querySelector('[data-message-author-role]');
      const role = roleNode?.getAttribute('data-message-author-role') || (outer.querySelector('[data-testid*="user"]') ? 'user' : 'assistant');
      if (role !== 'assistant' && role !== 'user') continue;
      const rendered = roleNode || outer;
      const text = (rendered.innerText || rendered.textContent || '').trim();
      if (!text) continue;
      unique.set(outer,{role,text});
    }
    return Array.from(unique.values());
  };
  const fmt = x => Math.round(x).toLocaleString('ru-RU');
  const save = async (value) => {
    try { await navigator.clipboard.writeText(value); return true; }
    catch(e) { return false; }
  };
  const status = () => {
    if (!conversation()) return 'inactive';
    if (last.messages >= settings.messages * 1.35 || last.tokens >= settings.tokens * 1.35) return 'critical';
    if (last.messages >= settings.messages || last.tokens >= settings.tokens) return 'warn';
    return 'normal';
  };
  function render() {
    const s = status();
    const label = s==='inactive' ? t.open : s==='critical' ? t.critical : s==='warn' ? t.warn : `${fmt(last.messages)} ${t.messages} · ≈${fmt(last.tokens)} ${t.tokens}`;
    container.innerHTML = `<button id="ccg-pill" class="pill ${s==='warn'||s==='critical'?s:''}" title="${escapeHtml(t.pillTitle)}" aria-expanded="${expanded}"><span class="dot"></span>${escapeHtml(label)}</button>`;
    if(expanded) {
      const warn = s === 'warn' || s === 'critical';
      const panel = document.createElement('div');
      panel.className='panel';
      panel.innerHTML = `<div class="head">${escapeHtml(t.title)} <button class="close" id="ccg-close" title="${escapeHtml(t.close)}">×</button></div>
        <div class="muted">${escapeHtml(t.subtitle)}</div>
        <div class="stats"><div class="stat"><strong>${fmt(last.messages)}</strong><span class="muted">${escapeHtml(t.visibleMessages)}</span></div><div class="stat"><strong>≈${fmt(last.tokens)}</strong><span class="muted">${escapeHtml(t.visibleTokens)}</span></div></div>
        ${warn?`<div class="notification">${escapeHtml(t.notification)}</div>`:`<div class="hint">${escapeHtml(t.hint)}</div>`}
        <div class="buttons"><button class="btn primary" id="ccg-copy">${escapeHtml(t.copy)}</button><button class="btn" id="ccg-export">${escapeHtml(t.exported)}</button></div>
        <div class="limits"><label>${escapeHtml(t.messageThreshold)}<input id="ccg-messages" type="number" min="10" max="1000" step="5" value="${settings.messages}"></label><label>${escapeHtml(t.tokenThreshold)}<input id="ccg-tokens" type="number" min="5000" max="1000000" step="5000" value="${settings.tokens}"></label></div>
        <div class="small">${escapeHtml(t.small)}</div>`;
      container.append(panel);
      panel.querySelector('#ccg-close').addEventListener('click',()=>{expanded=false;render();});
      panel.querySelector('#ccg-copy').addEventListener('click', async e=> {const ok=await save(handoffPrompt[lang]);e.target.textContent=ok?t.copied:t.copyFailed;});
      panel.querySelector('#ccg-export').addEventListener('click',()=>{
        const h=`# ChatGPT visible transcript\n\nSource: ${location.origin}${location.pathname}\nExport: ${new Date().toISOString()}\n\nWarning: Only currently rendered messages are included; this may NOT be the full conversation.\n\n`;
        const body=last.turns.map((t,i)=>`## ${i+1}. ${t.role}\n\n${t.text}\n`).join('\n---\n\n');
        const blob=new Blob([h+body],{type:'text/markdown;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`chat-checkpoint-${new Date().toISOString().slice(0,10)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      });
      const configure = () => {
        const m=Number(panel.querySelector('#ccg-messages').value);
        const t=Number(panel.querySelector('#ccg-tokens').value);
        if (Number.isFinite(m)&&m>=10&&m<=1000) settings.messages=Math.round(m);
        if (Number.isFinite(t)&&t>=5000&&t<=1000000) settings.tokens=Math.round(t);
        try{chrome.storage.local.set({[storageKey]:settings});}catch(e){}
        render();
      };
      panel.querySelector('#ccg-messages').addEventListener('change',configure);
      panel.querySelector('#ccg-tokens').addEventListener('change',configure);
    }
    container.querySelector('#ccg-pill').addEventListener('click',()=>{expanded=!expanded;render();});
  }
  const scan = () => {
    const turns = getTurns();
    const characters = turns.reduce((n,t)=>n+t.text.length,0);
    const tokens = turns.reduce((n,t)=>n+estimateTokens(t.text),0);
    const changed = turns.length !== last.messages || characters !== last.characters;
    last={messages:turns.length,characters,tokens,turns};
    if(changed) render();
  };
  const schedule = () => {clearTimeout(debounceId);debounceId=setTimeout(scan,900);};
  const observer = new MutationObserver(mutations=> {
    // Ignore mutations inside our own shadow DOM (not observed by documentElement observer).
    if(mutations.some(m => !root.contains(m.target))) schedule();
  });
  try { chrome.storage.local.get(storageKey, data=> {
    const s=data?.[storageKey]||{};
    if(Number.isInteger(s.messages)&&s.messages>=10) settings.messages=s.messages;
    if(Number.isInteger(s.tokens)&&s.tokens>=5000) settings.tokens=s.tokens;
    render(); scan();
  }); } catch(e) { render();scan(); }
  observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
  // ChatGPT is an SPA: periodically check URL changes even without a DOM event.
  let previousPath=location.pathname;
  setInterval(()=>{if(location.pathname!==previousPath){previousPath=location.pathname;last={messages:0,characters:0,tokens:0,turns:[]};scan();}},3000);
})();
