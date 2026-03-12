use midly::{Smf, Format, Header, Timing, TrackEvent, TrackEventKind, MidiMessage, num::u7, num::u4};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize)]
pub struct MidiNote {
    pub tick: u32,
    pub channel: u8,
    pub pitch: u8,
    pub velocity: u8,
    pub duration: u32,
}

#[derive(Serialize, Deserialize)]
pub struct MidiData {
    pub ticks_per_beat: u16,
    pub tracks: Vec<Vec<MidiNote>>,
}

pub fn parse_midi(path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let bytes = fs::read(path)?;
    let smf = Smf::parse(&bytes)?;

    let ticks_per_beat = match smf.header.timing {
        Timing::Metrical(tpb) => tpb.as_int(),
        Timing::Timecode(_, _) => 480,
    };

    let mut tracks: Vec<Vec<MidiNote>> = Vec::new();

    for track in &smf.tracks {
        let mut notes: Vec<MidiNote> = Vec::new();
        let mut tick: u32 = 0;
        let mut active_notes: std::collections::HashMap<(u8, u8), u32> = std::collections::HashMap::new();

        for event in track {
            tick += event.delta.as_int();
            match event.kind {
                TrackEventKind::Midi { channel, message } => {
                    match message {
                        MidiMessage::NoteOn { key, vel } => {
                            if vel.as_int() > 0 {
                                active_notes.insert((channel.as_int(), key.as_int()), tick);
                            } else {
                                if let Some(start) = active_notes.remove(&(channel.as_int(), key.as_int())) {
                                    notes.push(MidiNote {
                                        tick: start,
                                        channel: channel.as_int(),
                                        pitch: key.as_int(),
                                        velocity: 64,
                                        duration: tick - start,
                                    });
                                }
                            }
                        }
                        MidiMessage::NoteOff { key, .. } => {
                            if let Some(start) = active_notes.remove(&(channel.as_int(), key.as_int())) {
                                notes.push(MidiNote {
                                    tick: start,
                                    channel: channel.as_int(),
                                    pitch: key.as_int(),
                                    velocity: 64,
                                    duration: tick - start,
                                });
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        }
        tracks.push(notes);
    }

    let data = MidiData { ticks_per_beat, tracks };
    Ok(serde_json::to_string(&data)?)
}

pub fn write_midi(path: &str, json_data: &str) -> Result<(), Box<dyn std::error::Error>> {
    let data: MidiData = serde_json::from_str(json_data)?;

    let mut tracks_out: Vec<Vec<TrackEvent<'static>>> = Vec::new();

    for track_notes in &data.tracks {
        let mut events: Vec<(u32, TrackEventKind<'static>)> = Vec::new();

        for note in track_notes {
            events.push((
                note.tick,
                TrackEventKind::Midi {
                    channel: u4::new(note.channel & 0x0F),
                    message: MidiMessage::NoteOn {
                        key: u7::new(note.pitch & 0x7F),
                        vel: u7::new(note.velocity & 0x7F),
                    },
                },
            ));
            events.push((
                note.tick + note.duration,
                TrackEventKind::Midi {
                    channel: u4::new(note.channel & 0x0F),
                    message: MidiMessage::NoteOff {
                        key: u7::new(note.pitch & 0x7F),
                        vel: u7::new(0),
                    },
                },
            ));
        }

        events.sort_by_key(|e| e.0);

        let mut track_events: Vec<TrackEvent<'static>> = Vec::new();
        let mut last_tick: u32 = 0;

        for (tick, kind) in events {
            let delta = tick - last_tick;
            track_events.push(TrackEvent {
                delta: delta.into(),
                kind,
            });
            last_tick = tick;
        }

        track_events.push(TrackEvent {
            delta: 0.into(),
            kind: TrackEventKind::Meta(midly::MetaMessage::EndOfTrack),
        });

        tracks_out.push(track_events);
    }

    let smf = Smf {
        header: Header::new(
            Format::Parallel,
            Timing::Metrical(midly::num::u15::new(data.ticks_per_beat)),
        ),
        tracks: tracks_out,
    };

    let mut buffer = Vec::new();
    smf.write(&mut buffer)?;
    fs::write(path, buffer)?;

    Ok(())
}
