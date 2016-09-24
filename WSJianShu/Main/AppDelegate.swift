//
//  AppDelegate.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit
import MBProgressHUD

@UIApplicationMain

class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?


    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        
        jianShuVC()
        basicSetUp()
        return true
    }
    
    private func jianShuVC() {
        window = UIWindow(frame: UIScreen.main.bounds)
        let vc = MainTabBarController()
        window?.rootViewController = vc
        window?.makeKeyAndVisible()
        
    }
    
    private func testVC() {
        
        window = UIWindow(frame: UIScreen.main.bounds)
        let vc = ViewController()
        let nav = UINavigationController(rootViewController: vc)
        window?.rootViewController = nav
        window?.makeKeyAndVisible()
    }

}

// MARK: - Setting
extension AppDelegate {
    
    func basicSetUp() {
        
        
    }
    
}

