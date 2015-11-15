// ==UserScript==
// @name         zentreemap
// @namespace    http://your.homepage/
// @version      0.4
// @description  чуть доработанная карта, убран кортеж из тегов, добавлен переключатель группировки по номеру тега
// @author       krasnov
// @match        https://zenmoney.ru/a/*
// @grant        none
// ==/UserScript==
function getFunc(me,tagOrder) {
    return function(data) {
        var tree = [];
        var key_hash = {};
        var dl = data.length;

        for (var i = 0; i < dl; i++) {
            var trans = data[i];
            var dkey = '';
            var tkey = ''; // название категории

            // transaction filter
            if (me.checkSkip(trans)) continue;

            if (trans.tag_groups === null ) {
                if(trans.account_income != trans.account_outcome ){
                    continue; // не выводим переводы
                    tkey = 'Перевод'; 
                    dkey = 'transer';
                } else {
                    tkey = 'Без категории';
                    dkey = 'null';
                }
            } else {
                var tg_arr = [];
                var tg = trans.tag_groups[tagOrder];
                if (!tg) continue; // если тега с номером tagOrder нет, то пропускаем
                var tag = zm.profile.tag_groups[tg]['tag0']; 
                tg_arr.push(tag);
                tkey += zm.profile.tags[tag].title;

                dkey = tg_arr.sort().join(':');
            }
            var n = key_hash[dkey];
            if (n === undefined) {
                n = tree.push(['<p>' + tkey + '</p>', [], 0]) - 1;
                key_hash[dkey] = n;
            }


            var uc = zm.profile.user.currency,
                ts = Math.round(Math.abs(me.getTransSum(trans, uc)));
            tree[n][2] += ts;

            if ($('#dynamicsFilters .treeMapTypeList .type').val() == -1) {
                tr_sum = trans.outcome < 1 ? trans.outcome : Math.floor(trans.outcome);
                tr_instr = trans.instrument_outcome;
            } else {
                tr_sum = trans.income < 1 ? trans.income : Math.floor(trans.income);
                tr_instr = trans.instrument_income;
            }

            var tst = String(tr_sum).toCost();

            if (zm.profile.user.currency != tr_instr) {
                tst = String(tst).replace(/\s/g, '&thinsp;') + '&thinsp;' + htmlSymbol(tr_instr);
            }

            tree[n][1].push(['<div></div><p>' + tst + '</p>', ts, i]);
        }
        return tree;
    };
}

function activateZenTreeMap() {
    var me = zm.loader.page.treemap;
    me.generateTreeByTag = getFunc(me,0);
    me.generateTreeByTag1 = getFunc(me,1);

    $(".groupBy option[value='tag']").replaceWith("<option value='tag'>Первому тегу</option><option value='tag1'>Второму тегу</option>");
    $(".groupBy").val('tag').change();
}

$(function () {
    zm.bind('zenmoney_onload', function(){ 
        if (zm.loader.url == "reports/treemap")
        {
            var cookName = "zentreemap";
            var isZenTreeMap = $.cookie(cookName)==1;
            
            $("div.treeMapOrder span.title").on("click", function() {
                var isOn = $.cookie(cookName)==1;
                
                if (!isOn) {alert("zentreemap вкл.");} else { alert("zentreemap выкл. обновите страницу.");}
                
                $.cookie(cookName, !isOn?1:0, {
                    expires: 1000
                });
                
                if (!isOn) { activateZenTreeMap(); }
            });
            
            if (isZenTreeMap) {
                setTimeout(activateZenTreeMap, 1000);
            }
        }
    });
});
