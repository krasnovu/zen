// ==UserScript==
// @name         zenaccgroups
// @namespace    http://your.homepage/
// @version      0.4
// @description  группировка счетов в транзакциях
// @author       krasnov
// @match        https://zenmoney.ru/a/*
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

(function($){
    function ZenAccGroups(){
        this.acclist().find("li span.more").parent().remove();
        this.acclist().find("li.not_in_bal").removeClass("hidden");
        this.groups = [
            {id:"group_1",name:"Первая группа"}
            ,{id:"group_2",name:"Вторая группа"}
            ,{id:"group_3",name:"Третья группа"}
        ];
        this.cookieName = "zenaccgroups"+zm.profile.user.id;
        this.init();
    };

    ZenAccGroups.prototype = {
        acclist:function(){
            return $("ul.accounts_list");
        },
        accs:function(){
            return this.acclist().find(">li");
        },
        groupDivs:function(){
            return this.acclist().find("div[id]");
        },
        init:function() {
            var obj = this;
            
            obj.accs().each(function(index) {
                $(this).attr("id",$(this).find("span.title a").attr("rel"));
            });
            
            obj.groups.forEach(function (item,i,arr) {
                var g = obj.addGroup(item);
                if (i==0) g.append(obj.accs().detach());
            });

            obj.acclist().sortable({
                scroll: false,
                items:'div[id]',
                update: function() {
                    obj.backup();
                }
            });

            obj.restore();
            
            obj.connect();

            /*zm.pbind('zenmoney_hashchange', function() {
                obj.connect();
            });*/

            zm.pbind('update_balance', function() {
                setTimeout(function() { obj.connect(); },1000);
            });
        },
        addGroup:function(group) {
            var gr = $("<div/>").attr("id",group.id).sortable({items:'li[id]'});
            var sums = new Array();
            sums[zm.profile.user.currency]=0;

            gr.append(this.getGroupInfo(group,sums));
            this.acclist().append(gr);
            return gr;            
        },
        titleDblClicked:function(b,obj,groupId) {
            var title = $(b).html();
            var editableText = $("<textarea />");
            editableText.val(title);
            $(b).replaceWith(editableText);
            editableText.focus();
            editableText.on('blur',function() {
                var editableText = $(this).val();
                obj.groups.forEach(function(item,i,arr) {
                    if (item.id==groupId) {
                        item.name = editableText;
                        obj.backup();
                    }
                });
                var title = $("<b>");
                title.html(editableText);
                $(this).replaceWith(title);
                title.on('dblclick',function() { obj.titleDblClicked(this,obj); });
            });                        
        },
        getGroupInfo:function(group,sums) {
            var obj = this;
            var groupInfo = $("<div/>").addClass("groupInfo");
            var j=0;
            for (var key in sums){
                var li = $("<li/>");
                var spanBal = $("<span/>").addClass("balance").html("<b>"+htmlCost({sum:sums[key],instrument:zm.profile.instrument[key]},'text')+"</b>");
                var spanTit = $("<span/>").addClass("title").html("<b>"+(j==0?String(group.name).safeText():"&nbsp;")+"</b>");

                if (j==0) {
                    spanTit.find("b").on('dblclick',function() { 
                        obj.titleDblClicked(this, obj, group.id);
                    });
                }
                
                li.append(spanBal).append(spanTit);
                groupInfo.append(li);
                j++;
            }
            groupInfo.find("li:last").addClass("opened");
            return groupInfo;
        },
        connect:function() {
            var obj = this;
            obj.groupDivs().each(function() {
                var gid = $(this).attr("id");
                var group = obj.groups.filter(function(item, j, arr) {
                    return item.id == gid;
                });
                if (group.length>0) {
                    $(this).sortable({
                        scroll:false,
                        connectWith:obj.acclist().find("div[id]"),
                        update: function () {
                            obj.replace(group[0]);
                            obj.backup();
                        }
                    });
                    obj.replace(group[0]);
                }
            });
        },
        replace:function(group){
            var obj = this;
            var $group = $("div#"+group.id);
            var $groupInfo = $group.find("div.groupInfo");

            var sums = new Array();
            $group.find("li[id]").each(function() {
                var accId = $(this).attr("id");
                var acc = zm.profile.account[accId];

                if (isNaN(sums[acc.instrument])) {
                    sums[acc.instrument] = 0;
                }

                sums[acc.instrument] += Number(acc.balance);
            });

            if (sums.length == 0) {
                sums[zm.profile.user.currency] = 0;
            }
            
            $groupInfo.replaceWith(obj.getGroupInfo(group,sums));
        },
        backup:function() {
            var obj = this;
            var data = new Array();
            
            obj.groupDivs().each(function() {
                var gid = $(this).attr("id");
                var group = obj.groups.filter(function(item, j, arr) {
                    return item.id == gid;
                });
                var arr = new Array();
                $(this).find("li[id]").each(function(){
                    arr.push($(this).attr("id"));
                });
                data.push({group:group[0], accs:arr});
            });
            
            $.cookie(this.cookieName, JSON.stringify(data), {expires:1000});
        },
        restore:function() {
            var obj = this;
            var data = JSON.parse($.cookie(this.cookieName));
            if (data) {
                var grps = new Array();
                data.forEach(function(group,i,arr){
                    grps.push(group.group);
                    if (obj.acclist().find("div").is("#"+group.group.id)) {
                        obj.replace(group.group);
                        $("div#"+group.group.id).appendTo(obj.acclist());
                    }
                    else {
                        obj.addGroup(group.group);
                    }
                    
                    group.accs.forEach(function(acc,j,carr){
                        obj.acclist().find("#"+acc).appendTo(obj.acclist().find("div#"+group.group.id));
                    });
                });
                var notExists = this.groups.filter(function(item,i,arr) {
                    return !grps.some(function(citem,ci,carr) {
                        citem.id == item.id;
                    });
                });
                this.groups = grps.concat(notExists);
            }
        }
    };

    $(function () {
        $("head").append("<link rel='stylesheet' href='//ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css' type='text/css'/>");
        $("head").append("<script src='//ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js'/>");

        zm.bind('zenmoney_onload', function(){ 
            if (zm.loader.url == "transactions" || zm.loader.url == "reminders")
            {
                if ($("ul.accounts_list").is(":has(div[id])")) {}
                else {
                    var z = new ZenAccGroups();
                }
            }
        });
    });    

})(jQuery);
