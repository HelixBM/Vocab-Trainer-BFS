// answers.js — fair checking of typed answers. Self-check: `node answers.js`

// Compare form: lower case, umlauts as ae/oe/ue/ss, no punctuation or spaces,
// filler words (to, sth, sb, etw, jdn, jdm …) dropped.
function canon(s){
  return s.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[’']/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(to|sth|sb|etw|jdn|jdm|jd|jds)\b/g,' ')
    .replace(/\s+/g,'');
}

// "Trainer/in" → Trainer, Trainerin · "Kunde/-in" → Kunde, Kundin
// "bestimmte/r/s" → bestimmte, bestimmter, bestimmtes · "treten/schießen" → treten, schießen
function expandSlashes(s){
  let out = [''];
  for(const tok of s.split(/(\s+)/)){
    let opts = [tok];
    if(tok.includes('/')){
      const [base, ...rest] = tok.split('/');
      opts = [base];
      for(const r of rest){
        if(r === 'in') opts.push(base + 'in');
        else if(r === '-in') opts.push(base.replace(/e$/,'') + 'in');
        else if(r === 'r' || r === 's') opts.push(base + r);
        else if(!r.startsWith('-')) opts.push(r);
      }
    }
    out = out.flatMap(o => opts.map(t => o + t));
  }
  return out;
}

// Map of compare form → readable form for every accepted answer.
function answerVariants(ans){
  const clean = ans.replace(/\b(pl|BE|AE|AusE)\b|\b(hier|etwa):/g, '');
  const forms = [
    clean.replace(/\([^)]*\)/g, ' '),                                   // (Koch-)Rezept → Rezept
    clean.replace(/\(([^()\s,;:]*)\)/g, '$1').replace(/\([^)]*\)/g, ' ') // (Koch-)Rezept → Koch-Rezept
  ];
  const out = new Map();
  for(const f of forms){
    // split on ; , and sentence ends, but keep "für den Fall, dass" / "…, etw zu tun" whole
    for(const alt of [f, ...f.split(/;|,(?!\s*(?:dass|etw zu|zu)\b)|(?<=[a-zäöüß])[.?!](?=\s)/)]){
      for(const v of expandSlashes(alt)){
        const c = canon(v);
        if(c && !out.has(c)) out.set(c, v.replace(/\s+/g,' ').trim());
      }
    }
  }
  return out;
}

function within1(a, b){
  if(Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while(i < a.length && a[i] === b[i]) i++;
  return a.slice(i+1) === b.slice(i+1) || a.slice(i) === b.slice(i+1) || a.slice(i+1) === b.slice(i);
}

// → {ok:true} | {ok:true, almost:'Trainerin'} | {ok:false}
function checkAnswer(input, ans){
  const v = canon(input);
  if(!v) return {ok:false};
  const variants = answerVariants(ans);
  if(variants.has(v)) return {ok:true};
  for(const [c, shown] of variants) if(c.length > 6 && within1(v, c)) return {ok:true, almost:shown};
  return {ok:false};
}

if(typeof module !== 'undefined' && require.main === module){
  const assert = require('assert');
  const yes = (inp, ans) => assert.ok(checkAnswer(inp, ans).ok, `"${inp}" should pass for "${ans}"`);
  const no  = (inp, ans) => assert.ok(!checkAnswer(inp, ans).ok, `"${inp}" should fail for "${ans}"`);
  no('in', 'Mitschüler/in');
  yes('Mitschüler', 'Mitschüler/in'); yes('Mitschuelerin', 'Mitschüler/in');
  yes('Kundin', 'Kunde/-in'); yes('bestimmtes', 'bestimmte/r/s, gewisse/r/s'); yes('gewisse', 'bestimmte/r/s, gewisse/r/s');
  yes('Rezept', '(Koch-)Rezept'); yes('Kochrezept', '(Koch-)Rezept'); yes('Proteine', 'Eiweiß, Protein(e)');
  yes('persuade', 'to persuade sb'); yes('vor Angst haben', 'vor jdm/etw Angst haben, sich vor jdm/etw fürchten');
  yes('scissors', 'scissors pl'); yes('mobile phone', 'mobile (phone) BE'); yes('mobile', 'mobile (phone) BE');
  yes('falls', 'falls; für den Fall, dass');
  yes('Bitteschön', 'Bitte sehr. Bitteschön.'); yes('ins Ausland', 'im/ins Ausland');
  yes('fuer den Fall dass', 'falls; für den Fall, dass');
  no('tv', '(TV, Werbung:) auftreten'); yes('auftreten', '(TV, Werbung:) auftreten');
  yes('Schule', 'Studium, hier: Schule'); no('zu tun', 'jdn dazu bringen, etw zu tun');
  assert.deepStrictEqual(checkAnswer('Trainrin', 'Trainer/in'), {ok:true, almost:'Trainerin'});
  no('Hund', 'Huhn'); no('', 'Huhn'); no('Kino', 'Kinn');
  console.log('answers.js: all checks passed');
}
