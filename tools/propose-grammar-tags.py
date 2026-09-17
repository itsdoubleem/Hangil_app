#!/usr/bin/env python3
"""Proposes grammar tags for the exam-shaped items in data/.

    python3 tools/propose-grammar-tags.py            # show the distribution
    python3 tools/propose-grammar-tags.py --write    # write them into data/

This is a PROPOSER, not an authority. It was used once to tag 292 drill, trade
and paper items, and every proposal it made was read by hand before being
written — see OVERRIDE for the ones it got wrong. Run it again after adding
content, read what it suggests, and correct it.

Two things it exists to protect against, both learned the hard way:

  * A tag that lands on a third of the app stops meaning anything. Watch the
    percentages it prints; nothing here should be much above 10%.
  * ㄹ and ㄴ batchim are COMPOSED into the syllable, so a naive pattern like
    'ㄹ 때' never matches 할 때 or 쓸 때. That bug silently cost most of the
    ability, future and time-clause hits until the classes below were built.
"""
import json, glob, re, collections

def load_items():
    out=[]
    for dr in json.load(open('data/exam-drills.json'))['drills']:
        for i,it in enumerate(dr['items']): out.append((f'{dr["id"]}#{i}', it))
    for f in sorted(glob.glob('data/trades-*.json')):
        for tr in json.load(open(f))['trades']:
            for i,it in enumerate(tr['items']): out.append((f'{tr["id"]}#{i}', it))
    for f in sorted(glob.glob('data/exam-mock-*.json')):
        m=json.load(open(f))
        for sec in ('listening','reading'):
            for i,it in enumerate(m[sec]): out.append((f'{m["id"]}:{sec}#{i}', it))
    return out


GAP  = re.compile(r'\(\s*\)')
MEAN = re.compile(r'다음과 같은 뜻의 문장을 고르십시오\.\s*(.+)', re.S)

# Priority order. A match is consumed before later patterns run, so 면 안 되다
# counts as obligation and never also as a bare conditional.
#
# ㄹ and ㄴ batchim are COMPOSED into the syllable — 할, 쓸, 한 are single code
# points — so a pattern like "ㄹ 때" never matches real Korean. These classes hold
# every syllable ending in that consonant, which is what makes 할 때, 쓸 때 and
# 먹은 후에 findable at all. Getting this wrong silently loses most of the
# ability, future and time-clause hits.
_RL = ''.join(chr(0xAC00 + i) for i in range(11172) if i % 28 == 8)   # ...ㄹ
_RN = ''.join(chr(0xAC00 + i) for i in range(11172) if i % 28 == 4)   # ...ㄴ
L, N = f'(?:을|[{_RL}])', f'(?:은|[{_RN}])'

P = [
 # -아/어야 하다 is also composed (써야, 마셔야), so match "<syllable>야 + 하/되".
 ('obligation',      rf'[가-힣]야\s*(하|되|합니|됩니|돼)|(으)?면\s*안\s*(되|돼|됩니)'),
 ('ability',         rf'{L}\s*수\s*(있|없)'),
 ('hedging',         rf'기는\s*하지만|{L}\s*텐데|[았었]더라면'),
 ('reported-speech', r'(다고|냐고|자고|라고)\s*(하|했|합니|물)'),
 ('time-clauses',    rf'기\s*전에|{N}\s*[후뒤]에|{L}\s*때|고\s*나서|다음에'),
 ('becoming',        r'[아어워]졌|(?<!어떻)게\s*되'),
 ('feeling-endings', r'네요|군요|잖아요|더라고요'),
 ('desire-joining',  r'고\s*싶'),
 ('favours',         r'[아어해]\s*주[세십져]|[아어]\s*줘'),
 ('future',          rf'{L}\s*(거예요|겁니다|것입니다|거야)'),
 ('setup-clauses',   r'는데|[은ㄴ]데'),
 ('conditional',     r'[으]?면\s'),
 ('negation',        r'지\s*마[세십]|지\s*않|(?<![가-힣])안\s(?=[가-힣])|(?<![가-힣])못\s'),
 ('past',            r'(았|었|였)(어요|습니다|던)'),
 ('written-style',   rf'에\s*따라|[가-힣]된다|{N}다(?![가-힣])'),
 ('copula',          r'이에요|예요|입니다|아니에요|아닙니다'),
]
DISCRIM_ONLY = {
 # 'place-particles' is deliberately absent: 에서 is the ordinary locative in
 # nearly every one of these sentences, so it marks the item without being what
 # the item turns on. Unit g05 drills the 에/에서 contrast where it IS the choice.
 'existence':       r'있|없',
 'polite-requests': r'[으]?[세십][요시]',
}

def scan(text):
    """Tags present, highest-priority family first, each match consumed so that
       면 안 되다 counts as obligation and never also as a bare conditional."""
    t = text or ''
    found = set()
    for tag, pat in P:
        if re.search(pat, t):
            found.add(tag)
            t = re.sub(pat, ' ', t)
    return found

def consume(text):
    """What is left of a string once every recognised form is removed."""
    t = text or ''
    for _, pat in P: t = re.sub(pat, ' ', t)
    return t

def discriminating(correct, wrong):
    """Forms that help separate the right answer from the wrong ones."""
    c = scan(correct)
    w = [scan(x) for x in wrong]
    out = {t for t in c if sum(1 for ws in w if t in ws) < len(wrong)}
    # The loose ones are tested against the RESIDUE, so a 없 that belongs to
    # ㄹ 수 없다 is not also counted as plain 없다.
    rc, rw = consume(correct), [consume(x) for x in wrong]
    for t, p in DISCRIM_ONLY.items():
        if re.search(p, rc) and not any(re.search(p, x) for x in rw): out.add(t)
    return out

def shape_of(it):
    if it.get('picOptions'): return 'picture'
    if it.get('passage'):    return 'passage'
    lines = it.get('lines') or []
    if len(lines) > 1:       return 'dialogue'
    if lines or it.get('audio'):
        return 'reply' if re.search(r'이어지는 말', it.get('stem','')) else 'heard'
    if it.get('display'):    return 'sign'
    if it.get('pic'):        return 'picture'
    if MEAN.search(it.get('stem','')): return 'meaning'
    if GAP.search(it.get('stem','')):  return 'gap'
    return 'other'

# Hand corrections, applied after the rules. A proposer this blunt will always
# have a few misses, and an explicit list of them is better than bending a rule
# until it fits one item and breaks three others.
OVERRIDE = {
  # 조입니다 is 조이다 + ㅂ니다 (to tighten), not the copula 이다. The string
  # "입니다" is a substring of it, which no amount of regex can tell apart.
  't-electronics#10': {'-': {'copula'}},
}

def propose(it):
    """Grammar tags, by what the item actually turns on.

    The rule differs per shape because what is being tested differs per shape,
    and a tag applied where it is not load-bearing is worse than no tag: it sends
    someone to practise the wrong thing.

      gap       what goes IN the gap is the answer, so only the options count —
                the sentence around it is usually there to supply vocabulary.
      meaning   you must re-express the prompt sentence, so its grammar IS the item.
      sign      two or three words on a wall; the work is in the answer.
      reply     one line said to you and one line back; both are the item.
      passage
      dialogue  comprehension. Tagging every form that appears in six lines of
                notice is how a tag lands on a third of the app and stops meaning
                anything. These carry their shape tag and no grammar.
      picture   vocabulary, not grammar.
    """
    shape = shape_of(it)
    opts  = it.get('options') or []
    a     = it.get('a', 0)
    correct = opts[a] if opts else ''
    wrong   = [o for n, o in enumerate(opts) if n != a]
    stem    = it.get('stem', '')

    if shape in ('passage', 'dialogue', 'picture'): return set()
    if shape == 'gap':     return discriminating(correct, wrong)
    if shape == 'meaning':
        m = MEAN.search(stem)
        return scan(m.group(1) if m else '') | discriminating(correct, wrong)
    if shape == 'sign':    return discriminating(correct, wrong)
    if shape in ('reply', 'heard'):
        said = ' '.join([l['text'] for l in (it.get('lines') or [])] + ([it['audio']] if it.get('audio') else []))
        return scan(said) | discriminating(correct, wrong)
    return discriminating(correct, wrong)

def propose_final(key, it):
    tags = propose(it)
    o = OVERRIDE.get(key)
    if o:
        tags = (tags - o.get('-', set())) | o.get('+', set())
    return tags


if __name__ == '__main__':
    import collections, sys
    items = load_items()
    if '--write' in sys.argv:
        tags = {k: sorted(propose_final(k, it)) for k, it in items}
        def put(key, it):
            t = tags.get(key)
            if t: it['tags'] = t
            else: it.pop('tags', None)
        d = json.load(open('data/exam-drills.json'))
        for dr in d['drills']:
            for i, it in enumerate(dr['items']): put(f'{dr["id"]}#{i}', it)
        json.dump(d, open('data/exam-drills.json','w'), ensure_ascii=False, indent=2); open('data/exam-drills.json','a').write("\n")
        for f in sorted(glob.glob('data/trades-*.json')):
            d = json.load(open(f))
            for tr in d['trades']:
                for i, it in enumerate(tr['items']): put(f'{tr["id"]}#{i}', it)
            json.dump(d, open(f,'w'), ensure_ascii=False, indent=2); open(f,'a').write("\n")
        for f in sorted(glob.glob('data/exam-mock-*.json')):
            m = json.load(open(f))
            for sec in ('listening','reading'):
                for i, it in enumerate(m[sec]): put(f'{m["id"]}:{sec}#{i}', it)
            json.dump(m, open(f,'w'), ensure_ascii=False, indent=2); open(f,'a').write("\n")
        print("written:", sum(1 for v in tags.values() if v), "items")
        raise SystemExit
    rows = [(k, it, propose_final(k, it)) for k, it in items]
    c = collections.Counter(t for _, _, ts in rows for t in ts)
    sh = collections.Counter(shape_of(it) for _, it in items)
    print(f"{len(items)} items by shape:", dict(sh), "\n")
    for t, n in c.most_common(): print(f"  {t:18} {n:4}  ({round(100*n/len(items))}%)")
    print("\nno grammar proposed:", sum(1 for _, _, ts in rows if not ts))
