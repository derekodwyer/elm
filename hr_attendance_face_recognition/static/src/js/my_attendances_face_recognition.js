odoo.define('hr_attendance_face_recognition.my_attendances', function (require) {
    "use strict";

    var core = require('web.core');
    var Attendances = require('hr_attendance.my_attendances');
    var _t = core._t;
    var config = require('web.config');
    var Dialog = require('web.Dialog');
    var FieldOne2Many = require('web.relational_fields').FieldOne2Many;

    var FaceRecognitionDialog = Dialog.extend({
        template: 'WebCamDialogFace',
        init: function (parent, options) {
            options = options || {};
            options.fullscreen = config.device.isMobile;
            options.fullscreen = true;
            options.dialogClass = options.dialogClass || '' + ' o_act_window';
            options.size = 'large';
            options.title = _t("Face recognition process");
            this.labels_ids = options.labels_ids;
            this.descriptor_ids = options.descriptor_ids;
            this.labels_ids_emp = options.labels_ids_emp || [];
            // if face_recognition_mode true, after finded employee
            // call my_attendance for that employee without face_recognition
            console.log(options)
            console.log(this)
            this.face_recognition_mode = options.face_recognition_mode;
            this.parent = parent;
            this._super(parent, options);
        },

        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self.width = document.body.scrollWidth;
                self.height = document.body.scrollHeight;

                Webcam.set({
                    width: self.width,
                    height: self.height,
                    dest_width: self.width,
                    dest_height: self.height,
                    image_format: 'jpeg',
                    jpeg_quality: 100,
                    force_flash: false,
                    fps: 45,
                    swfURL: '/hr_attendance_face_recognition/static/src/libs/webcam.swf',
                    constraints: { optional: [{ minWidth: 600 }] }
                });
                Webcam.attach(self.$('#live_webcam')[0]);
                Webcam.on('live', function (data) {
                    $('video').css('width', '100%');
                    $('video').css('height', '100%');
                    $('#live_webcam').css('width', '100%');
                    $('#live_webcam').css('height', '100%');
                    self.face_predict();
                });
            });
        },

        interpolateAgePredictions: function (age, predictedAges) {
            predictedAges = [age].concat(predictedAges).slice(0, 30);
            const avgPredictedAge = predictedAges.reduce((total, a) => total + a) / predictedAges.length;
            return avgPredictedAge;
        },

        check_in_out: function (canvas, employee) {
            var debounced = _.debounce(() => {
                this.parent.face_recognition_access = true;
                if (this.parent.face_recognition_store)
                    this.parent.face_recognition_image = canvas.toDataURL().split(',')[1];
                if (this.face_recognition_mode) {
                    this.parent.do_action({
                        type: 'ir.actions.client',
                        tag: 'hr_attendance_my_attendances',
                        context: {
                            // check in/out without face recognition
                            'face_recognition_force': true,
                            // employee default
                            'employee': employee,
                            'face_recognition_auto': this.parent.face_recognition_auto,
                            'webcam_snapshot': this.parent.webcam_snapshot,
                            'face_recognition_image': this.parent.face_recognition_image
                        },
                    });
                    return
                }

                this.parent.update_attendance();
            }, 500, true);
            debounced();
        },

        check_face_filter: function (age, gender, emotion) {
            var age_access = false, gender_access = false, emotion_access = false;

            var p1 = this.parent.face_age.split('-')[0];
            var p2 = this.parent.face_age.split('-')[1];
            if (p1 === 'any')
                p1 = 0;
            if (p2 === 'any')
                p2 = 1000;
            p1 = Number(p1)
            p2 = Number(p2)

            if (age >= p1 && age <= p2)
                age_access = true;
            if (gender === this.parent.face_gender)
                gender_access = true;
            if (emotion === this.parent.face_emotion)
                emotion_access = true;

            if (this.parent.face_age === 'any-any')
                age_access = true;
            if (this.parent.face_gender === 'any')
                gender_access = true;
            if (this.parent.face_emotion === 'any')
                emotion_access = true;

            if (!age_access || !gender_access || !emotion_access)
                return false;
            return true;
        },

        face_detection: async function (video, canvas) {
            if (this.stop)
                return
            let predictedAges = [];
            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            faceapi.matchDimensions(canvas, displaySize);

            let engine = new faceapi.TinyFaceDetectorOptions();

            if (this.parent.face_recognition_engine == 'mtcnn'){
                const mtcnnForwardParams = {
                    // number of scaled versions of the input image passed through the CNN
                    // of the first stage, lower numbers will result in lower inference time,
                    // but will also be less accurate
                    maxNumScales: 10,
                    // scale factor used to calculate the scale steps of the image
                    // pyramid used in stage 1
                    scaleFactor: 0.709,
                    // the score threshold values used to filter the bounding
                    // boxes of stage 1, 2 and 3
                    scoreThresholds: [0.6, 0.7, 0.7],
                    // mininum face size to expect, the higher the faster processing will be,
                    // but smaller faces won't be detected
                    minFaceSize: 20
                }
                engine = new faceapi.MtcnnOptions(mtcnnForwardParams)
            }

            if (this.parent.face_recognition_engine == 'ssdMobilenetv1')
                engine = new faceapi.SsdMobilenetv1Options()

            const detections = await faceapi
                .detectSingleFace(video, engine)
                .withFaceLandmarks()
                .withFaceExpressions()
                .withAgeAndGender()
                .withFaceDescriptor();

            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
            if (detections) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);


                if (resizedDetections && Object.keys(resizedDetections).length > 0) {
                    const age = resizedDetections.age;
                    const interpolatedAge = this.interpolateAgePredictions(age, predictedAges);
                    const gender = resizedDetections.gender;
                    const expressions = resizedDetections.expressions;
                    const maxValue = Math.max(...Object.values(expressions));
                    const emotion = Object.keys(expressions).filter(
                        item => expressions[item] === maxValue
                    );
                    $("#age").text(`Age - ${interpolatedAge}`);
                    $("#gender").text(`Gender - ${gender}`);
                    $("#emotion").text(`Emotion - ${emotion[0]}`);

                    // Face recognition
                    const maxDescriptorDistance = 0.5;

                    // Add json, because faceapi use only string
                    this.labels_name_ids = [];
                    for (let k = 0; k < this.labels_ids.length; k++)
                        this.labels_name_ids.push(JSON.stringify(this.labels_ids[k]))

                    const labeledFaceDescriptors = await Promise.all(
                        this.labels_name_ids.map(async (label, i) => {
                            return new faceapi.LabeledFaceDescriptors(label, [this.descriptor_ids[i]])
                        })
                    )
                    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance)
                    const results = faceMatcher.findBestMatch(resizedDetections.descriptor);
                    const box = resizedDetections.detection.box;
                    const text = results.toString();
                    const drawBox = new faceapi.draw.DrawBox(box, { label: text });
                    drawBox.draw(canvas);

                    // access success
                    if (text.indexOf('unknown') === -1 &&
                        this.check_face_filter(interpolatedAge, gender, emotion[0])) {
                        if (this.parent.face_recognition_store)
                            await Webcam.snap(data_uri => {
                                this.parent.webcam_snapshot = data_uri.split(',')[1];
                            });
                        // split, because faceapi add match percentage
                        this.check_in_out(canvas, JSON.parse(text.split(' (')[0]));
                        return;
                    }
                }
            }
            await this.sleep(200);
            this.face_detection(video, canvas);
        },

        sleep: function (ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        face_predict: async function () {
            const video = document.getElementsByTagName("video")[0];
            const canvas = faceapi.createCanvasFromMedia(video);
            $(canvas).css('left', '16px');
            $(canvas).css('position', 'absolute');
            $(video).css('float', 'left');
            let container = document.getElementById("live_webcam");
            container.append(canvas);
            this.stop = false;
            this.face_detection(video, canvas);
        },

        destroy: function () {
            if ($('.modal-footer .btn-primary').length)
                $('.modal-footer .btn-primary')[0].click();
            this.stop = true;
            Webcam.off('live');
            Webcam.reset();
            this._super.apply(this, arguments);
        },
    });

    var MyAttendances = Attendances.include({
        events: {
            "click .o_hr_attendance_sign_in_out_icon": _.debounce(function () {
                this.update_attendance_with_recognition();
            }, 200, true),
            "click .o_hr_attendance_break_resume_icon": _.debounce(function () {
                this.update_break_resume_with_recognition();
            }, 200, true),
            "click .o_hr_attendance_back_button": _.debounce(function () {
                this.do_action({
                    type: 'ir.actions.client',
                    tag: 'hr_attendance_kiosk_mode',
                });
            }, 200, true)
        },

        // parse data setting from server
        parse_data_face_recognition: function () {
            var self = this;

            self.state_read.then(function (data) {
                var data = self.data;
                self.face_recognition_engine = data.face_recognition_engine
                self.face_recognition_enable = data.face_recognition_enable;
                self.face_recognition_store = data.face_recognition_store;
                self.face_emotion = data.face_emotion;
                self.face_gender = data.face_gender;
                var age_map = {
                    '20': '0-20',
                    '30': '20-30',
                    '40': '30-40',
                    '50': '40-50',
                    '60': '50-60',
                    '70': '60-any',
                    'any': 'any-any'
                }
                if (data.face_age === 'any')
                    self.face_age = 'any-any';
                else
                    self.face_age = age_map[Math.ceil(data.face_age).toString()];

                if (!self.face_recognition_access)
                    self.face_recognition_access = false;

                self.labels_ids = data.labels_ids;
                self.descriptor_ids = [];
                for (var f32base64 of data.descriptor_ids) {
                    self.descriptor_ids.push(new Float32Array(new Uint8Array([...atob(f32base64)].map(c => c.charCodeAt(0))).buffer))
                }
                self.face_photo = true;
                if (!self.labels_ids.length || !self.descriptor_ids.length)
                    self.face_photo = false;
                self.state_save.resolve();
            });
        },

        update_break_resume_with_recognition: function () {
            // if kiosk mode enable, recognition already done
            if (!this.face_recognition_enable || this.kiosk) {
                this.face_recognition_access = true;
                this.update_break_resume();
                return
            }

            this.promise_face_recognition.then(
                result => {
                    if (this.face_photo)
                        new FaceRecognitionDialog(this, {
                            labels_ids: this.labels_ids,
                            descriptor_ids: this.descriptor_ids,
                            break: true
                        }).open();
                    else
                        Swal.fire({
                            title: 'No one images/photos uploaded',
                            text: "Please go to your profile and upload 1 photo",
                            icon: 'error',
                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'Ok'
                        });
                },
                error => {
                    console.log(error);
                });
        },

        load_models: function () {
            let models_path = '/hr_attendance_face_recognition/static/src/js/models'
            /****Loading the model ****/
            return Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(models_path),
                faceapi.nets.mtcnn.loadFromUri(models_path),
                faceapi.nets.tinyFaceDetector.loadFromUri(models_path),
                faceapi.nets.faceLandmark68Net.loadFromUri(models_path),
                faceapi.nets.faceRecognitionNet.loadFromUri(models_path),
                faceapi.nets.faceExpressionNet.loadFromUri(models_path),
                faceapi.nets.ageGenderNet.loadFromUri(models_path)
            ]);
        },

        start: function () {
            this.promise_face_recognition = this.load_models();
            this.promise_face_recognition.then(
                result => {
                    this.state_render.then(
                        render => {
                            console.log("models success loaded");
                            if (this.face_photo) {
                                this.$('.o_form_binary_file_web_cam').removeClass('btn-warning');
                                this.$('.o_form_binary_file_web_cam').addClass('btn-success');
                                this.$('.o_form_binary_file_web_cam').text('Face recognition ON');
                            }
                            else {
                                this.$('.o_form_binary_file_web_cam').removeClass('btn-warning');
                                this.$('.o_form_binary_file_web_cam').addClass('btn-danger');
                                this.$('.o_form_binary_file_web_cam').text('Face recognition no photos');
                            }
                        })
                })
            this.parse_data_face_recognition();
            return $.when(this._super.apply(this, arguments));
        },

        update_attendance_with_recognition: function () {
            if (!this.face_recognition_enable) {
                this.face_recognition_access = true;
                this.update_attendance();
                return
            }
            // if kiosk mode enable, recognition already done
            if (this.kiosk) {
                this.face_recognition_access = true;
                this.update_attendance();
                return
            }
            this.promise_face_recognition.then(
                result => {
                    if (this.face_photo)
                        new FaceRecognitionDialog(this, {
                            labels_ids: this.labels_ids,
                            descriptor_ids: this.descriptor_ids
                        }).open();
                    else
                        Swal.fire({
                            title: 'No one images/photos uploaded',
                            text: "Please go to your profile and upload 1 photo",
                            icon: 'error',
                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'Ok'
                        });
                },
                error => {
                    console.log(error);
                });
        }

    });
    return { FaceRecognitionDialog: FaceRecognitionDialog }
});