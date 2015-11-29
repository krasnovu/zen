// ==UserScript==
// @name         zenaccgroups
// @namespace    http://your.homepage/
// @version      0.3
// @description  группировка счетов в транзакциях
// @author       krasnov
// @match        https://zenmoney.ru/a/*
// @grant        none
// ==/UserScript==

var __GROUPS = [
     {id:"group_1",name:"Первая группа"}
    ,{id:"group_2",name:"Вторая группа"}
    ,{id:"group_3",name:"Третья группа"}
               ];

var __COOKIEPREF = "zenaccgroups";

function getGroupInfo(groupName,sums) {
    var groupInfo = $("<div/>").addClass("groupInfo");
    var i=0;
    for (var key in sums){
        var li = $("<li/>");
        var spanBal = $("<span/>").addClass("balance").html("<b>"+htmlCost({sum:sums[key],instrument:zm.profile.instrument[key]},'text')+"</b>");
        var spanTit = $("<span/>").addClass("title").html("<b>"+(i==0?String(groupName).safeText():"&nbsp;")+"</b>");
        li.append(spanBal).append(spanTit);
        groupInfo.append(li);
        i++;
    }
    groupInfo.find("li:last").addClass("opened");
    return groupInfo;
}

function replaceGroupElement(groupId) {
    var group = $("div#"+groupId);
    var groupInfo = group.find("div.groupInfo");

    var sums = new Array();
    group.find("li[id]").each(function() {
        var accId = $(this).attr("id");
        var acc = zm.profile.account[accId];
        
        if (isNaN(sums[acc.instrument])) {
            sums[acc.instrument] = 0;
        }
        
        sums[acc.instrument] += Number(acc.balance);
    });
    
    var groupName = groupInfo.find("li span.title b").html();

    if (sums.length == 0) {
        sums[zm.profile.user.currency] = 0;
    }
    
    groupInfo.replaceWith(getGroupInfo(groupName,sums));
}

function addGroup(container,id,name) {
    var gr = $("<div/>").attr("id",id).sortable({items:'li[id]'});
    var sums = new Array();
    sums[zm.profile.user.currency]=0;
    
    gr.append(getGroupInfo(name,sums));
    container.append(gr);
    return gr;
}

function backupGroupsOrders(container) {
    var cookName = __COOKIEPREF+zm.profile.user.id;
    
    $.cookie(cookName, JSON.stringify(__GROUPS), {expires:1000});
    
    var orderGroups = new Array();
    container.find("div[id]").each(function(){
        orderGroups.push($(this).attr("id"));
    });
    $.cookie(cookName+'_ord', JSON.stringify(orderGroups), {expires: 1000});    

    __GROUPS.forEach(function (gitem,gi,garr) {
        var orderAccs = new Array();
        container.find('#'+gitem.id).find("li[id]").each(function(){
            orderAccs.push($(this).attr("id"));
        });
        $.cookie(cookName+'_'+gitem.id, JSON.stringify(orderAccs), {expires: 1000});
    });      
}

function restoreGroupsOrders(container) {
    var cookName = __COOKIEPREF+zm.profile.user.id;
    
    var groups = JSON.parse($.cookie(cookName));
    if (groups) {
        __GROUPS = groups;
    }
    
    var orderGroups = JSON.parse($.cookie(cookName+'_ord'));
    if (orderGroups) {
        orderGroups.forEach(function(item,i,arr){
            if ($("div").is("#"+item)) {;}
            else {
                addGroup(container,item,"");
            }
            $('#'+item).appendTo(container);
        });
    }
    
    __GROUPS.forEach(function (gitem,gi,garr) {
        $("#"+gitem.id+" div.groupInfo li span.title b").html(gitem.name);
        var orderAccs = JSON.parse($.cookie(cookName+'_'+gitem.id));
        if (orderAccs) {
            orderAccs.forEach(function(item,i,arr){
                $('#'+item).appendTo(container.find('#'+gitem.id));
            });
        }
    });    
}

function connectAllToAll(container) {
    container.find("div[id]").each(function(index){
        $(this).sortable({
            scroll: false,
            connectWith:"ul.accounts_list div[id]",
            update: function(event, ui) {
                var groupId = $(this).attr("id");
                replaceGroupElement(groupId);
                
                backupGroupsOrders(container);
            }
        });
        replaceGroupElement($(this).attr("id"));
    });
}

function activate() {
    $("ul.accounts_list li span.more").parent().remove();
    $("ul.accounts_list li.not_in_bal").removeClass("hidden");

    var acclist = $("ul.accounts_list");
    var accs = acclist.find("li");

    accs.each(function(index) {
        $(this).attr("id",$(this).find("span.title a").attr("rel"));
    });

    __GROUPS.forEach(function (item,i,arr) {
        var g = addGroup(acclist,item.id,item.name);
        if (i==0) g.append(accs.detach());
    });
    
    acclist.sortable({
        scroll: false,
        items:'div[id]',
        update: function(event, ui) {
            backupGroupsOrders(acclist);
        }
    });

    restoreGroupsOrders(acclist);

    connectAllToAll(acclist);
}

$(function () {
    $("head").append("<link rel='stylesheet' href='//ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css' type='text/css'/>");
    $("head").append("<script src='//ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js'/>");

    zm.bind('zenmoney_onload', function(){ 
        if (zm.loader.url == "transactions" || zm.loader.url == "reminders")
        {
            if ($("ul.accounts_list").is(":has(div[id])")) {}
            else {
                activate();
                /*zm.pbind('zenmoney_hashchange', function() {
                    connectAllToAll($('ul.accounts_list'));
                });*/
                zm.pbind('update_balance', function() {
                    setTimeout(function() { connectAllToAll($('ul.accounts_list')) },1000);
                });
            }
        }
    });
});
