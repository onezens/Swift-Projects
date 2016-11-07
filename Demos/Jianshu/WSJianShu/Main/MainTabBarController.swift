//
//  MainTabBarController.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/24.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit

class MainTabBarController: UITabBarController {

    override func viewDidLoad() {
        super.viewDidLoad()
        basicSetUp()
    }
    
    private func basicSetUp() {

        let discovery = setUpVC(vc: WSDiscoveryController(), title: "发现", imageName: "icon_tabbar_home")
        let follow = setUpVC(vc: WSFollowController(), title: "关注", imageName: "icon_tabbar_subscription")
        let message = setUpVC(vc: WSMessageController(), title: "消息", imageName: "icon_tabbar_notification")
        let profile = setUpVC(vc: WSProfileController(), title: "我的", imageName: "icon_tabbar_me")
        self.viewControllers = [discovery, follow, message, profile]
        
        //设置背景图片
        //tabBar.shadowImage = UIImage()
        //tabBar.backgroundImage = UIImage(named: "bg_tabbar")
        
    }
    
    private func setUpVC(vc:BaseViewController, title: String, imageName: String) -> UINavigationController {
        
        let nav = UINavigationController(rootViewController: vc)
        nav.navigationBar.titleTextAttributes = [NSFontAttributeName : UIFont.getNavTitleFont(), NSForegroundColorAttributeName : UIColor.getNavTitleColor()]
        vc.title = title
        vc.tabBarItem.image = UIImage(named: imageName)?.withRenderingMode(.alwaysOriginal)
        vc.tabBarItem.selectedImage = UIImage(named: imageName+"_active")?.withRenderingMode(.alwaysOriginal)
        vc.tabBarItem.setTitleTextAttributes([NSForegroundColorAttributeName : UIColor.getTabbarTintColor()], for: .normal)
        vc.tabBarItem.setTitleTextAttributes([NSForegroundColorAttributeName : UIColor.getTabbarHLTintColor()], for: .selected)
        vc.tabBarItem.titlePositionAdjustment = UIOffset(horizontal: 0.0, vertical: -4.0)
        return nav
    }
    
}
