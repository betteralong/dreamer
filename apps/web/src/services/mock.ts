export const getMockPrompt = () => {
    return [
        {
            "$id": "part_text_mt01",
            "type": "text",
            "content": "基于"
        },
        {
            "$id": "part_img_mt01",
            "type": "media",
            "mime": "image/png",
            "url": "https://cdn.dancf.com/fe-assets/20260313/9ed5cf309814be74bc807a3c094c4a1a.png",
            "name": "商品参考图",
            "extra": {
                "placeholder": {
                    "type": "image",
                    "label": "上传参考图",
                    "emphasize": false,
                    "removable": true
                }
            }
        },
        {
            "$id": "part_text_mt02",
            "type": "text",
            "content": "，生成一套主图（5张），商品为"
        },
        {
            "$id": "part_input_mt01",
            "type": "text",
            "content": "",
            "value": "",
            "extra": {
                "placeholder": {
                    "type": "input",
                    "label": "单人沙发",
                    "removable": true
                }
            }
        },
        {
            "$id": "part_text_mt03",
            "type": "text",
            "content": "，商品核心卖点是"
        },
        {
            "$id": "part_input_mt02",
            "type": "text",
            "content": "",
            "value": "",
            "extra": {
                "placeholder": {
                    "type": "input",
                    "label": "圆润包裹式造型，坐垫可拆洗",
                    "removable": true
                }
            }
        },
        {
            "$id": "part_text_mt04",
            "type": "text",
            "content": "，氛围/风格是"
        },
        {
            "$id": "part_input_mt03",
            "type": "text",
            "content": "",
            "value": "",
            "extra": {
                "placeholder": {
                    "type": "input",
                    "label": "舒适简约、家居治愈",
                    "removable": true
                }
            }
        },
        {
            "$id": "part_text_mt05",
            "type": "text",
            "content": "，适配"
        },
        {
            "$id": "part_select_mt01",
            "type": "text",
            "content": "",
            "value": "淘宝/天猫",
            "extra": {
                "placeholder": {
                    "type": "select",
                    "label": "电商平台",
                    "removable": true,
                    "options": [
                        {
                            "label": "淘宝/天猫",
                            "value": "淘宝/天猫"
                        },
                        {
                            "label": "亚马逊/跨境",
                            "value": "亚马逊/跨境"
                        },
                        {
                            "label": "抖音",
                            "value": "抖音"
                        },
                        {
                            "label": "京东",
                            "value": "京东"
                        },
                        {
                            "label": "拼多多",
                            "value": "拼多多"
                        },
                        {
                            "label": "小红书",
                            "value": "小红书"
                        },
                        {
                            "label": "1688",
                            "value": "1688"
                        },
                        {
                            "label": "快手",
                            "value": "快手"
                        }
                    ]
                }
            }
        },
        {
            "$id": "part_text_mt06",
            "type": "text",
            "content": "平台，主图比例为"
        },
        {
            "$id": "part_select_mt02",
            "type": "text",
            "content": "",
            "value": "1:1",
            "extra": {
                "placeholder": {
                    "type": "select",
                    "label": "主图比例",
                    "removable": true,
                    "options": [
                        {
                            "label": "1:1",
                            "value": "1:1"
                        },
                        {
                            "label": "3:4",
                            "value": "3:4"
                        },
                        {
                            "label": "9:16",
                            "value": "9:16"
                        },
                        {
                            "label": "2:3",
                            "value": "2:3"
                        }
                    ]
                }
            }
        }
    ]
}