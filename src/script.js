class IndieBeatMaker {
    constructor() {
        this.isPlaying = false;
        this.isRecording = false;
        this.sounds = {};
        this.recording = [];
        this.startTime = 0;
        this.recordingStartTime = 0;
        this.recorder = null;
        this.audioChunks = [];
        this.controlledSounds = ['synth1', 'synth2', 'bass', 'fx'];

        this.limiter = new Tone.Limiter(-3).toDestination();
        this.mainOutput = new Tone.Gain(0.7).connect(this.limiter);
        
        this.initializeRecorder();
        this.initializeElements();
        this.setupSounds();
        this.setupEventListeners();
        this.setupGSAPAnimations();
    }

    initializeRecorder() {
        const dest = Tone.context.createMediaStreamDestination();
        this.recorder = new MediaRecorder(dest.stream);
        Tone.Destination.connect(dest);

        this.recorder.ondataavailable = (e) => {
            this.audioChunks.push(e.data);
        };

        this.recorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const link = document.createElement('a');
            link.href = audioUrl;
            link.download = 'beat.mp3';
            link.click();
            this.audioChunks = [];
        };
    }

    initializeElements() {
        this.startAudioBtn = document.getElementById('startAudioBtn');
        this.playBtn = document.getElementById('playBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.timer = document.getElementById('timer');
        this.pads = document.querySelectorAll('.pad');
        this.pitchControl = document.getElementById('pitchControl');
        this.lengthControl = document.getElementById('lengthControl');
        this.colorPicker = document.getElementById('colorPicker');
        this.soundUpload = document.getElementById('soundUpload');
        this.stopAllBtn = document.getElementById('stopAllBtn');
    }

    async setupSounds() {
        const soundConfigs = {
            kick: new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 4,
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0,
                    release: 0.2
                }
            }).set({ volume: -2 }),
            
            snare: new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0,
                    release: 0.2
                }
            }).set({ volume: -5 }),
            
            hihat: new Tone.MetalSynth({
                frequency: 200,
                envelope: {
                    attack: 0.001,
                    decay: 0.1,
                    release: 0.01
                },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            }).set({ volume: -10 }),

            clap: new Tone.NoiseSynth({
                noise: { type: 'pink' },
                envelope: {
                    attack: 0.001,
                    decay: 0.3,
                    sustain: 0,
                    release: 0.1
                }
            }).set({ volume: -5 }),

            synth1: new Tone.Synth({
                oscillator: { type: 'square' },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.1,
                    release: 0.1
                }
            }).set({ volume: -8 }),

            synth2: new Tone.Synth({
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.1,
                    release: 0.1
                }
            }).set({ volume: -8 }),

            bass: new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.2,
                    release: 0.2
                }
            }).set({ volume: -5 }),

            fx: new Tone.PluckSynth({
                attackNoise: 1,
                dampening: 4000,
                resonance: 0.9
            }).set({ volume: -10 })
        };

        for (const [name, synth] of Object.entries(soundConfigs)) {
            synth.connect(this.mainOutput);
            this.sounds[name] = synth;
        }

        await Tone.loaded();
    }

    setupEventListeners() {
        this.startAudioBtn.addEventListener('click', async () => {
            await Tone.start();
            await Tone.loaded();
            this.recordingStatus.textContent = 'Ready to make beats!';
            this.startAudioBtn.classList.add('hidden');
        });

        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.recordBtn.addEventListener('click', () => this.toggleRecord());
        this.saveBtn.addEventListener('click', () => this.save());
        this.stopAllBtn.addEventListener('click', () => {
            this.stopAllSounds();
            this.recordingStatus.textContent = 'All sounds stopped';
        });

        this.pads.forEach(pad => {
            pad.addEventListener('click', () => this.playSound(pad.dataset.sound));
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playSound(pad.dataset.sound);
            });
        });

        this.pitchControl.addEventListener('input', () => this.updateSoundSettings());
        this.lengthControl.addEventListener('input', () => this.updateSoundSettings());
        this.colorPicker.addEventListener('input', (e) => this.updatePadColor(e.target.value));
        this.soundUpload.addEventListener('change', (e) => this.handleSoundUpload(e));

        document.addEventListener('keydown', (e) => {
            const keyMappings = {
                '1': 'kick', '2': 'snare', '3': 'hihat', '4': 'clap',
                'q': 'synth1', 'w': 'synth2', 'e': 'bass', 'r': 'fx',
                ' ': () => this.togglePlay(),
                'x': () => this.toggleRecord(),
                's': () => this.save(),
                'z': () => {
                    this.stopAllSounds();
                    this.recordingStatus.textContent = 'All sounds stopped';
                }
            };
            if (keyMappings[e.key.toLowerCase()]) {
                if (typeof keyMappings[e.key.toLowerCase()] === 'function') {
                    keyMappings[e.key.toLowerCase()]();
                } else {
                    this.playSound(keyMappings[e.key.toLowerCase()]);
                    const pad = document.querySelector(`[data-sound="${keyMappings[e.key.toLowerCase()]}"]`);
                    pad.classList.add('active');
                    setTimeout(() => pad.classList.remove('active'), 100);
                }
            }
        });
    }

    updateSoundSettings() {
        const pitch = parseFloat(this.pitchControl.value);
        const length = parseFloat(this.lengthControl.value);
        
        for (const soundName of this.controlledSounds) {
            const sound = this.sounds[soundName];
            if (sound.frequency) {
                sound.frequency.value *= pitch;
            }
            if (sound.envelope) {
                sound.envelope.attack *= length;
                sound.envelope.decay *= length;
                sound.envelope.release *= length;
            }
        }
    }

    updatePadColor(color) {
        this.pads.forEach(pad => {
            pad.style.backgroundColor = color;
        });
    }

    async handleSoundUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const buffer = await Tone.Buffer.fromUrl(URL.createObjectURL(file));
            const player = new Tone.Player(buffer).connect(this.mainOutput);
            this.sounds['customSound'] = player;
            
            const newPad = document.createElement('div');
            newPad.className = 'pad bg-gray-600 h-24 rounded-lg cursor-pointer flex items-center justify-center text-xs relative';
            newPad.dataset.sound = 'customSound';
            newPad.textContent = 'CUSTOM';
            newPad.addEventListener('click', () => this.playSound('customSound'));
            document.querySelector('.grid').appendChild(newPad);
        }
    }

    playSound(soundName) {
        if (!this.sounds[soundName]) return;

        const pitch = this.controlledSounds.includes(soundName) ? parseFloat(this.pitchControl.value) : 1;
        const length = this.controlledSounds.includes(soundName) ? parseFloat(this.lengthControl.value) : 1;

        switch(soundName) {
            case 'kick':
                this.sounds[soundName].triggerAttackRelease('C1', '8n');
                break;
            case 'snare':
            case 'hihat':
            case 'clap':
                this.sounds[soundName].triggerAttackRelease('16n');
                break;
            case 'synth1':
                this.sounds[soundName].triggerAttackRelease('C4', '16n' * length, undefined, pitch);
                break;
            case 'synth2':
                this.sounds[soundName].triggerAttackRelease('E4', '16n' * length, undefined, pitch);
                break;
            case 'bass':
                this.sounds[soundName].triggerAttackRelease('C2', '8n' * length, undefined, pitch);
                break;
            case 'fx':
                this.sounds[soundName].triggerAttackRelease('C5', '32n' * length, undefined, pitch);
                break;
            case 'customSound':
                this.sounds[soundName].start();
                break;
        }

        if (this.isRecording) {
            this.recording.push({
                sound: soundName,
                time: Tone.now() - this.recordingStartTime,
                pitch,
                length
            });
        }

        const pad = document.querySelector(`[data-sound="${soundName}"]`);
        if (pad) {
            pad.classList.add('active');
            setTimeout(() => pad.classList.remove('active'), 100);
        }
    }

    setupGSAPAnimations() {
        gsap.from('.pad', {
            duration: 0.8,
            opacity: 0,
            y: 50,
            stagger: 0.1,
            ease: 'power3.out'
        });

        gsap.from('header', {
            duration: 1.2,
            opacity: 0,
            y: -50,
            ease: 'power3.out'
        });

        gsap.from('.btn', {
            duration: 0.6,
            opacity: 0,
            scale: 0.8,
            stagger: 0.1,
            ease: 'back.out(1.7)'
        });
    }

    async togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            await this.play();
        }
    }

    async play() {
        if (!this.recording.length) {
            this.recordingStatus.textContent = 'Record something first!';
            return;
        }
        
        await Tone.context.resume();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.isPlaying = true;
        this.playBtn.textContent = 'STOP';
        this.playBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
        this.playBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
        
        const startTime = Tone.now() + 0.1;

        this.recording.forEach(event => {
            Tone.Transport.schedule((time) => {
                if (this.isPlaying) {
                    this.playSound(event.sound);
                }
            }, startTime + event.time);
        });

        Tone.Transport.start();
    }

    toggleRecord() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.recording = [];
        this.isRecording = true;
        this.recordingStartTime = Tone.now();
        this.recordBtn.classList.remove('bg-red-500');
        this.recordBtn.classList.add('bg-red-700');
        this.recordingStatus.textContent = 'Recording...';
        this.updateTimer();
        this.recorder.start();
    }

    stopRecording() {
        this.isRecording = false;
        this.recordBtn.classList.remove('bg-red-700');
        this.recordBtn.classList.add('bg-red-500');
        this.recordingStatus.textContent = 'Recording stopped';
        clearInterval(this.timerInterval);
        if (this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    }

    stop() {
        this.isPlaying = false;
        this.playBtn.textContent = 'PLAY';
        this.playBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
        this.playBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        Tone.Transport.stop();
        if (this.isRecording) {
            this.stopRecording();
        }
    }

    updateTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Tone.now() - this.recordingStartTime));
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.timer.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    save() {
        if (this.recording.length === 0) {
            alert('Record something first!');
            return;
        }
        this.recorder.start();
        this.play();

        const lastEvent = this.recording[this.recording.length - 1];
        const duration = lastEvent.time + 0.5; 

        setTimeout(() => {
            this.recorder.stop();
            this.stop();
        }, duration * 1000);

        this.recordingStatus.textContent = 'Exporting MP3...';
        setTimeout(() => {
            this.recordingStatus.textContent = 'Export complete!';
        }, duration * 1000 + 500);
    }

    stopAllSounds() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        for (const sound of Object.values(this.sounds)) {
            if (sound.triggerRelease) {
                sound.triggerRelease();
            } else if (sound.stop) {
                sound.stop();
            }
        }
        this.isPlaying = false;
        this.playBtn.textContent = 'PLAY';
        this.playBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
        this.playBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        if (this.isRecording) {
            this.stopRecording();
        }
        this.recordingStatus.textContent = 'All sounds stopped';
    }
}

window.addEventListener('load', () => {
    const beatMaker = new IndieBeatMaker();
});

