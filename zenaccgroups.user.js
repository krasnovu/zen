// ==UserScript==
// @name         zenaccgroups
// @namespace    http://your.homepage/
// @version      0.1
// @description  группировка счетов в транзакциях
// @author       krasnov
// @match        https://zenmoney.ru/a/*
// @grant        none
// ==/UserScript==

var __GROUPS = [
    {id:"group_1",name:"Первая группа"},
    {id:"group_2",name:"Вторая группа"},
    {id:"group_3",name:"Третья группа"}
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
    var userId = zm.profile.user.id;
    var orderGroups = new Array();
    container.find("div[id]").each(function(){
        orderGroups.push($(this).attr("id"));
    });
    $.cookie(__COOKIEPREF+userId,JSON.stringify(orderGroups), {expires: 1000});    

    __GROUPS.forEach(function (gitem,gi,garr) {
        var orderAccs = new Array();
        container.find('#'+gitem.id).find("li[id]").each(function(){
            orderAccs.push($(this).attr("id"));
        });
        $.cookie(__COOKIEPREF+userId+'_'+gitem.id, JSON.stringify(orderAccs), {expires: 1000});
    });      
}

function restoreGroupsOrders(container) {
    var userId = zm.profile.user.id;
    var orderGroups = JSON.parse($.cookie(__COOKIEPREF+userId));
    if (orderGroups) {
        orderGroups.forEach(function(item,i,arr){
            $('#'+item).appendTo(container);
        });
    }
    
    __GROUPS.forEach(function (gitem,gi,garr) {
        var orderAccs = JSON.parse($.cookie(__COOKIEPREF+userId+'_'+gitem.id));
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
    var acclist = $("ul.accounts_list");
    var accs = acclist.find("li");

    acclist.find("li span.more").parent().remove();
    acclist.find("li.not_in_bal").removeClass("hidden");
    
    accs.each(function(index) {
        $(this).attr("id",$(this).find("span.title a").attr("rel"));
    });

    __GROUPS.forEach(function (item,i,arr) {
        var g = addGroup(acclist,item.id,item.name);
        if (i==0) g.append(accs.detach());
    });
    
    acclist.sortable({
        items:'div[id]',
        update: function(event, ui) {
            backupGroupsOrders(acclist);
        }
    });

    restoreGroupsOrders(acclist);
    
    connectAllToAll(acclist);
}

function load_jquery_ui()
{
    $("head").append("<link rel='stylesheet' href='//ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css' type='text/css'/>")

    var script = document.createElement("script");
    script.setAttribute("src", "//ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js");
    script.addEventListener("load",activate);
    document.body.appendChild(script);
}

$(function () {
    zm.bind('zenmoney_onload', function(){ 
        if (zm.loader.url == "transactions" || zm.loader.url == "reminders")
        {
            setTimeout(load_jquery_ui,0);
        }
    });
});
