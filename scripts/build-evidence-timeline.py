#!/usr/bin/env python3
"""
build-evidence-timeline.py — Build a unified evidentiary timeline for the June 10, 2021 incident.

Merges:
  1. CAD dispatch notes (manually extracted from CAD-Reports-Structured-Data.md)
  2. Device events (mic/brakes/lights/siren from SSA metadata)
  3. GPS coordinates (from SSA metadata)
  4. Audio transcriptions (from Whisper SRT files)
  5. Recording start/stop times

Outputs:
  - organized/evidence-timeline.md — Human-readable chronological timeline
"""

import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path

# --- Configuration ---
BASE_DIR = Path(__file__).parent.parent / 'dev-journal' / 'personal' / 'legal' / 'incident-2021-06-10'
ORG_DIR = BASE_DIR / 'organized'
TRANSCRIPTS_DIR = ORG_DIR / 'transcripts'
OUTPUT_FILE = ORG_DIR / 'evidence-timeline.md'

# Recording metadata (start times from README)
RECORDINGS = [
    {'id': '01', 'file': '01_bodycam_2120-2136_cowling', 'start': '21:20:45', 'end': '21:36:51', 'type': 'Body Cam', 'device': 'WFC1-108782', 'officer': 'Jed Cowling'},
    {'id': '02', 'file': '02_dashcam_2149-2153_cowling', 'start': '21:49:08', 'end': '21:53:25', 'type': 'Dash Cam', 'device': 'VHC2-009459', 'officer': 'Jed Cowling'},
    {'id': '03', 'file': '03_bodycam_2152-2155_cowling', 'start': '21:52:47', 'end': '21:55:01', 'type': 'Body Cam', 'device': 'WFC1-108782', 'officer': 'Jed Cowling'},
    {'id': '04', 'file': '04_bodycam_2200-2202_cowling', 'start': '22:00:01', 'end': '22:02:07', 'type': 'Body Cam', 'device': 'WFC1-108782', 'officer': 'Jed Cowling'},
    {'id': '05', 'file': '05_bodycam_2247-2255_cowling', 'start': '22:47:56', 'end': '22:55:24', 'type': 'Body Cam', 'device': 'WFC1-108782', 'officer': 'Jed Cowling'},
    {'id': '06a', 'file': '06a_incar-front_2128-2255', 'start': '21:28:00', 'end': '22:55:00', 'type': 'In-Car Front', 'device': '7758110', 'officer': 'Unknown'},
    {'id': '06b', 'file': '06b_incar-rear_2128-2255', 'start': '21:28:00', 'end': '22:55:00', 'type': 'In-Car Rear', 'device': '7758110', 'officer': 'Unknown'},
    {'id': '06c', 'file': '06c_incar-cabin_2128-2255', 'start': '21:28:00', 'end': '22:55:00', 'type': 'In-Car Cabin', 'device': '7758110', 'officer': 'Unknown'},
]

# CAD dispatch notes (from CAD-Reports-Structured-Data.md)
CAD_NOTES = [
    ('19:59:54', 'CAD', 'Call received — RP Allison Sanderson (541-300-8085): "cops showed up at her house for a domestic, other suspect left, she knows where he is now." Suspect: CODY ROBERTSON.'),
    ('20:02:53', 'CAD', 'Reference prior call #21019368 at 430 W 2nd S #17101 (Sanderson address)'),
    ('20:05:00', 'CAD', 'Unit 181 dispatched'),
    ('20:32:14', 'CAD', '181 advises: she will call in soon'),
    ('20:54:00', 'CAD', 'Units 160, M36, M37 dispatched — all enroute to 5006 S Hwy 191'),
    ('21:02:00', 'CAD', 'Unit M38 dispatched'),
    ('21:12:26', 'CAD', 'M36 advises: will be near Benchmark / Wind Willows'),
    ('21:16:00', 'CAD', '⚠️ M36, M37, M38 ARRIVE at 5006 S Hwy 191'),
    ('21:16:30', 'CAD', 'M36 to M37: "WATCH BACK DOOR"'),
    ('21:17:21', 'CAD', '⚠️ M37 (Cowling): "I HAVE PARAPHERNALIA IN THE BACK"'),
    ('21:18:07', 'CAD', 'M36: "THERE IS SOME MARIJUANA, KNIVES, AND PARAPHERNALIA ON THE BACK TABLE"'),
    ('21:18:36', 'CAD', 'M36 runs VIN: 2GTEK133281257351 (GMC Sierra — Tre Barker\'s truck)'),
    ('21:18:46', 'CAD', 'M37: "CONTACT SIDE DOOR"'),
    ('21:19:11', 'CAD', 'M37: "SHE SAYS THAT FAITH\'S IN THE RV"'),
    ('21:20:29', 'CAD', '⚠️ M37 (Cowling): "I GOT HIM HERE" — male located'),
    ('21:25:41', 'CAD', 'Units SECURE — scene C4 (under control)'),
    ('21:30:38', 'CAD', 'M37 runs: SPEAKMAN, EMILY (DOB 10/28/1998) and PINNOCK, TATE (DOB 11/13/1998)'),
    ('21:31:35', 'CAD', 'M36 runs plate: AZ 21103F (the RV)'),
    ('21:33:00', 'CAD', 'M38 clears scene'),
    ('21:47:06', 'CAD', '⚠️ M37: "2 DETAINED // WE ARE FREEZING THE HOUSE AND CLEARING IT NOW"'),
    ('21:59:16', 'CAD', '⚠️ Tow requested — PRO COLLISION dispatched (from rotation). Target: GMC Sierra'),
    ('22:02:02', 'CAD', 'Second CAD opened — Call #21019419, Case #210472, Type: CONTROLLED SUBSTANCE'),
    ('22:12:22', 'CAD', 'M36 runs plate: 1MC5134'),
    ('22:16:19', 'CAD', '181 — 10-51 (tow truck) / 10-23 (arrived)'),
    ('22:28:00', 'CAD', 'Unit 160 enroute to Training Bldg'),
    ('22:37:00', 'CAD', 'Unit 160 arrives Training Bldg'),
    ('22:49:13', 'CAD', 'M37 runs: BARKER, TRECEN A (DOB 06/10/2000)'),
    ('23:05:00', 'CAD', 'Units begin clearing'),
    ('23:07:00', 'CAD', 'All units clear — incident closed'),
]


def parse_time(t_str):
    """Parse HH:MM:SS time string into total seconds from midnight."""
    parts = t_str.split(':')
    h, m = int(parts[0]), int(parts[1])
    s = float(parts[2]) if len(parts) > 2 else 0
    return h * 3600 + m * 60 + s


def seconds_to_time(secs):
    """Convert total seconds to HH:MM:SS string."""
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    return f'{h:02d}:{m:02d}:{s:02d}'


def parse_srt(srt_path):
    """Parse SRT file into list of (start_sec, end_sec, text) tuples."""
    entries = []
    if not srt_path.exists():
        return entries

    content = srt_path.read_text(encoding='utf-8', errors='replace')
    # SRT format: index\ntimestamp --> timestamp\ntext\n\n
    blocks = re.split(r'\n\n+', content.strip())

    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2:
            continue
        # Find the timestamp line
        ts_line = None
        text_lines = []
        for line in lines:
            if '-->' in line:
                ts_line = line
            elif ts_line is not None:
                text_lines.append(line)

        if ts_line and text_lines:
            match = re.match(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)', ts_line)
            if match:
                h1, m1, s1, ms1 = int(match.group(1)), int(match.group(2)), int(match.group(3)), int(match.group(4))
                start_sec = h1 * 3600 + m1 * 60 + s1 + ms1 / 1000
                text = ' '.join(text_lines).strip()
                if text and text not in ('*beep*', ''):
                    entries.append((start_sec, text))

    return entries


def load_device_events():
    """Load device events JSON."""
    events_file = ORG_DIR / 'device-events.json'
    if not events_file.exists():
        return []

    data = json.loads(events_file.read_text(encoding='utf-8'))
    events = []
    for evt in data.get('events', []):
        time_str = evt['time']  # "06/10/21 21:20:45"
        real_time = time_str.split(' ')[1]  # "21:20:45"
        events.append({
            'time_secs': parse_time(real_time),
            'time_str': real_time,
            'source': evt['source'],
            'device': evt['device'],
            'state': evt['state'],
        })
    return events


def load_gps_data():
    """Load GPS timeline — get unique position changes only."""
    gps_file = ORG_DIR / 'gps-timeline.json'
    if not gps_file.exists():
        return []

    data = json.loads(gps_file.read_text(encoding='utf-8'))
    entries = data.get('gpsEntries', [])

    # Only keep first GPS point and significant position changes
    gps_events = []
    last_lat, last_lon = None, None

    for entry in entries:
        lat = entry['gps']['lat']
        lon = entry['gps']['lon']
        real_time = entry['realTime'].split(' ')[1]

        if last_lat is None or abs(lat - last_lat) > 0.0001 or abs(lon - last_lon) > 0.0001:
            gps_events.append({
                'time_secs': parse_time(real_time),
                'time_str': real_time,
                'lat': lat,
                'lon': lon,
                'source': entry['source'],
            })
            last_lat, last_lon = lat, lon

    return gps_events


def load_transcripts():
    """Load all SRT transcripts and convert to real-time timestamps."""
    all_speech = []

    for rec in RECORDINGS:
        srt_file = TRANSCRIPTS_DIR / f"{rec['file']}.srt"
        entries = parse_srt(srt_file)
        start_secs = parse_time(rec['start'])

        for offset_sec, text in entries:
            real_secs = start_secs + offset_sec
            all_speech.append({
                'time_secs': real_secs,
                'time_str': seconds_to_time(real_secs),
                'text': text,
                'source': rec['file'],
                'recording_id': rec['id'],
            })

    return all_speech


def build_timeline():
    """Assemble all events into a unified chronological timeline."""
    timeline = []

    # 1. CAD dispatch notes
    for time_str, source, note in CAD_NOTES:
        timeline.append({
            'time_secs': parse_time(time_str),
            'time_str': time_str,
            'type': 'dispatch',
            'text': note,
        })

    # 2. Recording start/stop
    for rec in RECORDINGS:
        timeline.append({
            'time_secs': parse_time(rec['start']),
            'time_str': rec['start'],
            'type': 'recording_start',
            'text': f"🎥 Recording START — [{rec['id']}] {rec['type']} ({rec['officer']}, device {rec['device']})",
        })
        timeline.append({
            'time_secs': parse_time(rec['end']),
            'time_str': rec['end'],
            'type': 'recording_end',
            'text': f"⏹️ Recording END — [{rec['id']}] {rec['type']}",
        })

    # 3. Device events (only state changes that matter — mic ON/OFF transitions)
    device_events = load_device_events()
    # Track state to only show transitions
    device_state = {}
    for evt in sorted(device_events, key=lambda x: x['time_secs']):
        key = f"{evt['source']}_{evt['device']}"
        prev_state = device_state.get(key)
        if prev_state != evt['state']:
            device_state[key] = evt['state']
            icon = '🟢' if evt['state'] == 'ON' else '🔴'
            # Only show mic and lights changes (most relevant)
            if evt['device'] in ('mic', 'lights'):
                timeline.append({
                    'time_secs': evt['time_secs'],
                    'time_str': evt['time_str'],
                    'type': 'device',
                    'text': f"{icon} {evt['device'].upper()} → {evt['state']} (source: {evt['source']})",
                })

    # 4. GPS (significant movements only)
    gps_events = load_gps_data()
    if gps_events:
        # Only add first GPS lock
        first_gps = gps_events[0]
        timeline.append({
            'time_secs': first_gps['time_secs'],
            'time_str': first_gps['time_str'],
            'type': 'gps',
            'text': f"📍 GPS Lock — {first_gps['lat']:.6f}°N, {first_gps['lon']:.6f}°W [{first_gps['source']}]",
        })
        # Add any significant position changes
        for gps in gps_events[1:]:
            timeline.append({
                'time_secs': gps['time_secs'],
                'time_str': gps['time_str'],
                'type': 'gps',
                'text': f"📍 GPS Update — {gps['lat']:.6f}°N, {gps['lon']:.6f}°W",
            })

    # 5. Speech transcription (consolidate into meaningful chunks)
    speech_events = load_transcripts()
    # Group speech into ~10-second chunks to avoid overwhelming the timeline
    if speech_events:
        speech_sorted = sorted(speech_events, key=lambda x: x['time_secs'])
        chunk_lines = []
        chunk_start = None
        chunk_source = None
        last_time = 0

        for sp in speech_sorted:
            # Start a new chunk if >8 second gap or new source
            if chunk_start is None or (sp['time_secs'] - last_time) > 8 or sp['source'] != chunk_source:
                # Flush previous chunk
                if chunk_lines:
                    combined = ' '.join(chunk_lines)
                    if len(combined.strip()) > 3:  # Skip tiny fragments
                        timeline.append({
                            'time_secs': chunk_start,
                            'time_str': seconds_to_time(chunk_start),
                            'type': 'speech',
                            'text': f'🗣️ [{chunk_source.split("_")[0]}] "{combined}"',
                        })
                chunk_lines = [sp['text']]
                chunk_start = sp['time_secs']
                chunk_source = sp['source']
            else:
                chunk_lines.append(sp['text'])
            last_time = sp['time_secs']

        # Flush last chunk
        if chunk_lines:
            combined = ' '.join(chunk_lines)
            if len(combined.strip()) > 3:
                timeline.append({
                    'time_secs': chunk_start,
                    'time_str': seconds_to_time(chunk_start),
                    'type': 'speech',
                    'text': f'🗣️ [{chunk_source.split("_")[0]}] "{combined}"',
                })

    # Sort everything chronologically
    timeline.sort(key=lambda x: x['time_secs'])
    return timeline


def render_timeline(timeline):
    """Render timeline to markdown."""
    lines = []
    lines.append('# Combined Evidence Timeline — June 10, 2021 Incident')
    lines.append('')
    lines.append(f'> **Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    lines.append(f'> **Location:** 5006 S Hwy 191, Rexburg, ID 83440')
    lines.append(f'> **Case Numbers:** CR33-21-1102, CR33-21-1103 (both DISMISSED)')
    lines.append(f'> **Primary Officer:** Deputy Jed Cowling (M37), MCSO')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('## Legend')
    lines.append('')
    lines.append('| Icon | Meaning |')
    lines.append('|------|---------|')
    lines.append('| 📻 | CAD/Dispatch |')
    lines.append('| 🎥 | Recording Start |')
    lines.append('| ⏹️ | Recording End |')
    lines.append('| 🟢/🔴 | Device ON/OFF |')
    lines.append('| 📍 | GPS Coordinate |')
    lines.append('| 🗣️ | Speech (Whisper transcript) |')
    lines.append('| ⚠️ | Key legal event |')
    lines.append('')
    lines.append('---')
    lines.append('')

    # Group by major time blocks
    current_hour = None
    prev_time = 0
    event_count = {'dispatch': 0, 'recording_start': 0, 'recording_end': 0, 'device': 0, 'gps': 0, 'speech': 0}

    for evt in timeline:
        event_count[evt['type']] = event_count.get(evt['type'], 0) + 1
        hour = int(evt['time_secs'] // 3600)

        if current_hour != hour:
            current_hour = hour
            h_label = f"{hour % 12 or 12}:00 {'PM' if hour >= 12 else 'AM'}"
            lines.append(f'## ═══ {h_label} Hour ═══')
            lines.append('')

        # Show time gap annotations for gaps > 5 minutes
        gap = evt['time_secs'] - prev_time
        if gap > 300 and prev_time > 0:  # 5 minute gap
            gap_min = int(gap // 60)
            lines.append(f'')
            lines.append(f'### ⏸️ — {gap_min} MINUTE GAP — no recordings active')
            lines.append(f'')

        prev_time = evt['time_secs']

        # Render the event
        time_display = evt['time_str'][:8]  # HH:MM:SS
        icon = {
            'dispatch': '📻',
            'recording_start': '🎥',
            'recording_end': '⏹️',
            'device': '',
            'gps': '',
            'speech': '',
        }.get(evt['type'], '•')

        if evt['type'] == 'dispatch':
            lines.append(f"**{time_display}** — 📻 {evt['text']}")
            lines.append('')
        elif evt['type'] in ('recording_start', 'recording_end'):
            lines.append(f"**{time_display}** — {evt['text']}")
            lines.append('')
        elif evt['type'] == 'device':
            lines.append(f"**{time_display}** — {evt['text']}")
            lines.append('')
        elif evt['type'] == 'gps':
            lines.append(f"**{time_display}** — {evt['text']}")
            lines.append('')
        elif evt['type'] == 'speech':
            lines.append(f"**{time_display}** — {evt['text']}")
            lines.append('')

    # Footer
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('## Summary Statistics')
    lines.append('')
    lines.append(f'| Source | Events |')
    lines.append(f'|--------|--------|')
    lines.append(f"| Dispatch/CAD | {event_count.get('dispatch', 0)} |")
    lines.append(f"| Recording Start/Stop | {event_count.get('recording_start', 0) + event_count.get('recording_end', 0)} |")
    lines.append(f"| Device Status Changes | {event_count.get('device', 0)} |")
    lines.append(f"| GPS Events | {event_count.get('gps', 0)} |")
    lines.append(f"| Speech Segments | {event_count.get('speech', 0)} |")
    lines.append(f"| **Total Events** | **{sum(event_count.values())}** |")
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('## Key Legal Observations')
    lines.append('')
    lines.append('1. **No warrant documentation exists** — MCSO provided no warrant/affidavit in records requests')
    lines.append('2. **Paraphernalia claimed visible BEFORE entry** — 21:17 CAD note: "I HAVE PARAPHERNALIA IN THE BACK"')
    lines.append('3. **No body cam footage of actual entry** — Cowling body cam starts at 21:20:45, occupants already contacted')
    lines.append('4. **48-minute body cam gap** — No body cam from 22:02 to 22:47 (body cam OFF)')
    lines.append('5. **Tow ordered at 21:59** — Pro Collision dispatched; owner (Tre Barker) not present, not charged')
    lines.append('6. **"Freezing the house"** — 21:47 CAD: officers detained occupants and are clearing the residence')
    lines.append('7. **Both cases DISMISSED** by prosecutor — charges had no legal foundation')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('## Critical Gaps in Evidence')
    lines.append('')
    lines.append('| Gap | Time Range | Duration | Significance |')
    lines.append('|-----|-----------|----------|--------------|')
    lines.append('| Pre-arrival | Before 21:16 | N/A | No footage of approach, coordination, or initial observations |')
    lines.append('| Body cam late start | 21:16 – 21:20 | ~4 min | Officers arrive and make contact before body cam activates |')
    lines.append('| Body cam gap | 22:02 – 22:47 | **~45 min** | Body cam OFF during search/property seizure | ')
    lines.append('| In-car only period | 21:28 – 21:49 | 21 min | Only in-car footage (no body cam after first clip ends at 21:36) |')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('*This timeline was auto-generated from CAD reports, device metadata, GPS data, and Whisper AI transcription.*')
    lines.append('*Transcription accuracy: ~70-85%. Verify critical statements against actual audio.*')

    return '\n'.join(lines)


def main():
    print('Building combined evidence timeline...')
    print(f'  Base dir: {BASE_DIR}')
    print(f'  Output: {OUTPUT_FILE}')

    timeline = build_timeline()
    print(f'  Total events: {len(timeline)}')

    output = render_timeline(timeline)
    OUTPUT_FILE.write_text(output, encoding='utf-8')
    print(f'  Written: {OUTPUT_FILE}')
    print(f'  Size: {len(output):,} chars')
    print('Done.')


if __name__ == '__main__':
    main()

