#!/usr/bin/env python3
"""summarize.py — turns the EE_Web feedback sheet into a per-page report.

In the response sheet (Google Sheets) choose File > Download > Comma-separated values, save the file OUTSIDE this repository
(the repository is public; e.g. Electrical_circuit_for_RE/EE_Web_feedback/), then run

    python3 feedback/summarize.py path/to/responses.csv            # writes responses_report.md next to the CSV
    python3 feedback/summarize.py path/to/responses.csv -o report.md

Columns are found by the English part of the bilingual question titles (create_form.gs), so the sheet may be in Thai or English.
Only the standard library is used."""
import argparse, collections, csv, os, re, statistics, sys

KEYS = {'page': '(page)', 'rate': 'help you understand', 'kind': 'what is it about', 'text': 'what was confusing', 'device': '(device)'}


def columns(header):
    low = [h.strip().lower() for h in header]
    col = {k: next((i for i, h in enumerate(low) if key in h), None) for k, key in KEYS.items()}
    col['time'] = 0
    missing = [k for k in ('page', 'rate') if col[k] is None]
    if missing:
        sys.exit(f'columns not found: {missing}; header was {header}')
    return col


def page_key(page):
    """'8.4 ch8_4_pf_correction.html' -> (8, 4); the roadmap first, unknown pages last"""
    m = re.match(r'\s*(\d+)\.(\d+)', page)
    return (int(m.group(1)), int(m.group(2))) if m else ((0, 0) if 'index' in page else (99, 0))


def device_kind(dev):
    m = re.search(r'(\d+)×(\d+)', dev or '')
    return '' if not m else ('มือถือ' if int(m.group(1)) < 640 else 'แท็บเล็ต' if int(m.group(1)) < 1000 else 'จอใหญ่')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('csv'); ap.add_argument('-o', '--out')
    a = ap.parse_args()
    with open(a.csv, encoding='utf-8-sig', newline='') as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        sys.exit('no responses in the file')
    col, data = columns(rows[0]), rows[1:]
    get = lambda r, k: (r[col[k]].strip() if col[k] is not None and col[k] < len(r) else '')

    pages = collections.defaultdict(list)
    for r in data:
        pages[get(r, 'page') or '(ไม่ระบุหน้า)'].append(r)
    scores = [int(get(r, 'rate')) for r in data if get(r, 'rate').isdigit()]
    kinds = collections.Counter(k.strip() for r in data for k in get(r, 'kind').split(', ') if k.strip())
    devs = collections.Counter(device_kind(get(r, 'device')) or 'ไม่ทราบ' for r in data)
    langs = collections.Counter((get(r, 'device').split(' · ')[0] or '?') for r in data)
    times = [get(r, 'time') for r in data if get(r, 'time')]

    out = [f'# สรุปความเห็นต่อเว็บ EE_Web ({len(data)} ความเห็น)', '']
    if times:
        out += [f'ช่วงเวลา: {times[0]} ถึง {times[-1]}', '']
    out += ['## ภาพรวม', '']
    if scores:
        dist = collections.Counter(scores)
        out.append(f'- คะแนนเฉลี่ย {statistics.mean(scores):.2f} จาก 5 ({len(scores)} คนให้คะแนน) · ' + ' · '.join(f'{v} คะแนน: {dist[v]}' for v in range(1, 6)))
    out.append('- เรื่องที่ถูกเลือก: ' + (' · '.join(f'{k} {n}' for k, n in kinds.most_common()) or 'ไม่มี'))
    out.append('- อุปกรณ์: ' + ' · '.join(f'{k} {n}' for k, n in devs.most_common()) + ' · ภาษา: ' + ' · '.join(f'{k} {n}' for k, n in langs.most_common()))
    out += ['', '## รายหน้า (คะแนนเฉลี่ยต่ำสุดก่อน)', '', '| หน้า | ความเห็น | คะแนนเฉลี่ย | ได้ 1–2 | เรื่องที่ถูกเลือก |', '|---|---|---|---|---|']

    def mean(rs):
        s = [int(get(r, 'rate')) for r in rs if get(r, 'rate').isdigit()]
        return (statistics.mean(s) if s else None), sum(1 for v in s if v <= 2)

    order = sorted(pages, key=lambda p: (mean(pages[p])[0] if mean(pages[p])[0] is not None else 9, page_key(p)))
    for p in order:
        m, low = mean(pages[p])
        kc = collections.Counter(k.strip() for r in pages[p] for k in get(r, 'kind').split(', ') if k.strip())
        ms = '-' if m is None else '%.2f' % m
        ks = ', '.join('%s %d' % (k.split(' / ')[-1], n) for k, n in kc.most_common()) or '-'
        out.append(f'| {p} | {len(pages[p])} | {ms} | {low} | {ks} |')

    out += ['', '## ข้อความที่นักศึกษาเขียน (เรียงตามหน้า)', '']
    for p in sorted(pages, key=page_key):
        notes = [r for r in pages[p] if get(r, 'text')]
        if not notes:
            continue
        out += [f'### {p}', '']
        for r in notes:
            tag = ', '.join(k.split(' / ')[-1] for k in get(r, 'kind').split(', ') if k.strip())
            score = get(r, 'rate') or '-'
            text = get(r, 'text').replace('\n', ' ')
            out.append('- (%s%s) %s' % (score, '; ' + tag if tag else '', text))
        out.append('')

    dst = a.out or os.path.splitext(a.csv)[0] + '_report.md'
    with open(dst, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out).rstrip() + '\n')
    print(f'{len(data)} responses, {len(pages)} pages -> {dst}')


if __name__ == '__main__':
    main()
